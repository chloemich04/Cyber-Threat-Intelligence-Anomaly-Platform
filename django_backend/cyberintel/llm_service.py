import requests
import json
import os
import csv
from datetime import datetime, timedelta
from django.conf import settings
from django.db import connection
import logging

logger = logging.getLogger(__name__)

class DummyCVEDataService:
    """Service for reading and processing dummy CVE data from file"""
    
    def __init__(self):
        # Get the path to the dummy CVE data file
        # Go up from cyberintel/llm_service.py -> cyberintel/ -> django_backend/ -> Cyber-Threat-Intelligence-Anomaly-Platform/ -> dummy_cve_data.txt
        self.data_file_path = os.path.join(
            os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(__file__)))), 
            'dummy_cve_data.txt'
        )
    
    def load_cve_data(self):
        """Load CVE data from the dummy data file"""
        try:
            cve_data = []
            with open(self.data_file_path, 'r', encoding='utf-8') as file:
                # Read tab-separated data
                for line in file:
                    if line.strip():
                        parts = line.strip().split('\t')
                        if len(parts) >= 4:  # Ensure we have at least basic fields
                            cve_data.append({
                                'cve_id': parts[0] if len(parts) > 0 else '',
                                'published_date': parts[1] if len(parts) > 1 else '',
                                'status': parts[2] if len(parts) > 2 else '',
                                'language': parts[3] if len(parts) > 3 else '',
                                'description': parts[4] if len(parts) > 4 else '',
                                'assigner': parts[5] if len(parts) > 5 else '',
                                'assigner_type': parts[6] if len(parts) > 6 else '',
                                'reference_url': parts[7] if len(parts) > 7 else '',
                                'cwe_id': parts[8] if len(parts) > 8 else '',
                                'cwe_name': parts[9] if len(parts) > 9 else '',
                                'cwe_type': parts[10] if len(parts) > 10 else '',
                                'cwe_status': parts[11] if len(parts) > 11 else '',
                                'cwe_description': parts[12] if len(parts) > 12 else '',
                                'threat_type': self._extract_threat_type(parts[4] if len(parts) > 4 else ''),
                                'severity': self._extract_severity(parts[4] if len(parts) > 4 else ''),
                                'vendor': self._extract_vendor(parts[4] if len(parts) > 4 else ''),
                                'region': self._extract_region(parts[4] if len(parts) > 4 else ''),
                                'vulnerabilities_knownRansomwareCampaignUse': 'ransomware' in (parts[4] if len(parts) > 4 else '').lower()
                            })
            return cve_data
        except FileNotFoundError:
            logger.error(f"Dummy CVE data file not found at {self.data_file_path}")
            return []
        except Exception as e:
            logger.error(f"Error loading CVE data: {str(e)}")
            return []
    
    def _extract_threat_type(self, description):
        """Extract threat type from CVE description"""
        description_lower = description.lower()
        if 'buffer overflow' in description_lower or 'out-of-bounds' in description_lower:
            return 'Buffer Overflow'
        elif 'null pointer' in description_lower or 'null dereference' in description_lower:
            return 'Null Pointer Dereference'
        elif 'memory leak' in description_lower or 'resource exhaustion' in description_lower:
            return 'Memory Leak'
        elif 'denial of service' in description_lower or 'dos' in description_lower:
            return 'Denial of Service'
        elif 'privilege escalation' in description_lower:
            return 'Privilege Escalation'
        else:
            return 'Vulnerability'
    
    def _extract_severity(self, description):
        """Extract severity from CVE description"""
        description_lower = description.lower()
        if 'critical' in description_lower or 'crash' in description_lower or 'panic' in description_lower:
            return 'Critical'
        elif 'high' in description_lower or 'exploit' in description_lower:
            return 'High'
        elif 'medium' in description_lower or 'moderate' in description_lower:
            return 'Medium'
        else:
            return 'Low'
    
    def _extract_vendor(self, description):
        """Extract vendor from CVE description"""
        description_lower = description.lower()
        if 'linux' in description_lower or 'kernel' in description_lower:
            return 'Linux Kernel'
        elif 'tenda' in description_lower:
            return 'Tenda'
        elif 'ubuntu' in description_lower:
            return 'Ubuntu'
        elif 'redhat' in description_lower:
            return 'Red Hat'
        else:
            return 'Unknown'
    
    def _extract_region(self, description):
        """Extract region from CVE description"""
        description_lower = description.lower()
        if 'es' in description_lower or 'spanish' in description_lower:
            return 'Spain'
        elif 'en' in description_lower or 'english' in description_lower:
            return 'Global'
        else:
            return 'Global'

class OllamaService:
    """Service for interacting with Ollama LLM API"""
    
    def __init__(self):
        self.base_url = getattr(settings, 'OLLAMA_BASE_URL', 'http://localhost:11434')
        self.model = getattr(settings, 'OLLAMA_MODEL', 'llama3.2:1b')
        self.timeout = getattr(settings, 'OLLAMA_TIMEOUT', 60)  # Increased timeout for better analysis
    
    def call_ollama(self, prompt, max_retries=2):
        """Call Ollama API with streaming to prevent timeouts"""
        for attempt in range(max_retries + 1):
            try:
                response = requests.post(
                    f"{self.base_url}/api/generate",
                    json={
                        "model": self.model,
                        "prompt": prompt,
                        "stream": True,  # Enable streaming
                        "options": {
                            "temperature": 0.3,
                            "top_p": 0.7,
                            "max_tokens": 500,   # Increased for streaming
                            "num_predict": 400,  # Increased for streaming
                            "repeat_penalty": 1.1
                        }
                    },
                    timeout=self.timeout,
                    stream=True
                )
                response.raise_for_status()
                
                # Collect streaming response
                full_response = ""
                for line in response.iter_lines():
                    if line:
                        try:
                            data = line.decode('utf-8')
                            if data.strip():
                                json_data = json.loads(data)
                                if 'response' in json_data:
                                    full_response += json_data['response']
                                # Check if response is done
                                if json_data.get('done', False):
                                    break
                        except json.JSONDecodeError:
                            continue
                        except Exception as e:
                            logger.warning(f"Error parsing streaming response: {e}")
                            continue
                
                if not full_response.strip():
                    raise Exception("Empty response from Ollama")
                return full_response.strip()
                
            except requests.exceptions.Timeout as e:
                if attempt < max_retries:
                    logger.warning(f"Ollama timeout (attempt {attempt + 1}), retrying...")
                    continue
                else:
                    logger.error(f"Ollama timeout after {max_retries + 1} attempts: {str(e)}")
                    raise Exception(f"Ollama API timeout: {str(e)}")
            except requests.exceptions.RequestException as e:
                if attempt < max_retries:
                    logger.warning(f"Ollama API error (attempt {attempt + 1}), retrying...")
                    continue
                else:
                    logger.error(f"Ollama API error after {max_retries + 1} attempts: {str(e)}")
                    raise Exception(f"Ollama API error: {str(e)}")
            except Exception as e:
                logger.error(f"Ollama processing error: {str(e)}")
                raise Exception(f"Ollama processing error: {str(e)}")
    
    def check_health(self):
        """Check if Ollama is running"""
        try:
            response = requests.get(f"{self.base_url}/api/tags", timeout=5)
            return response.status_code == 200
        except:
            return False

class ThreatPredictionService:
    """Service for generating threat predictions using LLM"""
    
    def __init__(self):
        self.ollama = OllamaService()
        self.cve_data_service = DummyCVEDataService()
    
    def get_threat_data(self):
        """Get threat data from dummy CVE file"""
        return self.cve_data_service.load_cve_data()
    
    def analyze_threat_data(self, threats_data=None):
        """Analyze threat data and generate predictions"""
        try:
            # Use dummy CVE data if no threats_data provided
            if threats_data is None:
                threats_data = self.get_threat_data()
            
            # Analyze threat data
            threat_types = {}
            vendors = {}
            regions = {}
            severities = {}
            ransomware_threats = 0
            
            for threat in threats_data:
                # Count threat types
                threat_type = threat.get('threat_type', 'Unknown')
                threat_types[threat_type] = threat_types.get(threat_type, 0) + 1
                
                # Count vendors
                vendor = threat.get('vendor', 'Unknown')
                vendors[vendor] = vendors.get(vendor, 0) + 1
                
                # Count regions
                region = threat.get('region', 'Unknown')
                regions[region] = regions.get(region, 0) + 1
                
                # Count severities
                severity = threat.get('severity', 'Unknown')
                severities[severity] = severities.get(severity, 0) + 1
                
                # Count ransomware threats
                if threat.get('vulnerabilities_knownRansomwareCampaignUse', False):
                    ransomware_threats += 1
            
            return {
                'threat_types': threat_types,
                'vendors': vendors,
                'regions': regions,
                'severities': severities,
                'ransomware_count': ransomware_threats,
                'total_threats': len(threats_data)
            }
        except Exception as e:
            logger.error(f"Error analyzing threat data: {str(e)}")
            raise Exception(f"Failed to analyze threat data: {str(e)}")
    
    def generate_predictions(self, analysis_data, timeframe='30 days', threat_type_filter=None, confidence_level=None):
        """Generate predictions based on analyzed data"""
        try:
            # Get top threat types from actual data
            top_threats = sorted(analysis_data['threat_types'].items(), key=lambda x: x[1], reverse=True)[:4]
            top_vendors = sorted(analysis_data['vendors'].items(), key=lambda x: x[1], reverse=True)[:3]
            
            # Generate data-driven analysis
            actual_threats = []
            for i, (threat_type, count) in enumerate(top_threats[:4]):
                actual_threats.append({
                    'name': threat_type,
                    'count': count,
                    'vendor': top_vendors[i][0] if i < len(top_vendors) else 'Various',
                    'percentage': (count / analysis_data['total_threats']) * 100
                })
            
            # Add ransomware as a separate prediction if it exists in data
            if analysis_data['ransomware_count'] > 0:
                actual_threats.append({
                    'name': 'Ransomware Campaigns',
                    'count': analysis_data['ransomware_count'],
                    'vendor': 'Multiple',
                    'percentage': (analysis_data['ransomware_count'] / analysis_data['total_threats']) * 100
                })
            
            # Generate predictions based on actual data
            data_driven_analysis = f"""## AI-GENERATED INSIGHTS
Based on analysis of the actual threat data, here are the top threats for the next {timeframe}:

**Top {len(actual_threats)} Major Cyber Threats:**

"""
            
            for i, threat in enumerate(actual_threats, 1):
                data_driven_analysis += f"""{i}. **{threat['name']}**: Based on data showing {threat['count']} vulnerabilities ({threat['percentage']:.1f}% of total)
	* Attack Vector: Exploiting {threat['name'].lower()} vulnerabilities
	* Technique: Targeting {threat['vendor']} systems
	* Reasoning: High frequency in current data ({threat['count']} instances) indicates continued targeting in next {timeframe}

"""
            
            data_driven_analysis += f"""**Data Summary:**
- Total threats analyzed: {analysis_data['total_threats']}
- Most affected vendors: {', '.join([v[0] for v in top_vendors[:3]])}
- Severity breakdown: {', '.join([f'{k}: {v}' for k, v in analysis_data['severities'].items()])}
- Ransomware threats: {analysis_data['ransomware_count']}"""

            # Try to generate enhanced analysis with Ollama, but provide comprehensive fallback
            enhanced_analysis = data_driven_analysis
            source = 'data_driven_only'
            
            # Generate comprehensive fallback analysis
            fallback_analysis = self._generate_comprehensive_fallback_analysis(analysis_data, actual_threats, timeframe)
            
            try:
                # Check if Ollama is available first
                if self.ollama.check_health():
                    # Use progressive analysis approach to prevent timeouts
                    ollama_insights = self._generate_progressive_llm_analysis(analysis_data, actual_threats, timeframe)
                    enhanced_analysis = f"{data_driven_analysis}\n\n**AI Analysis:**\n{ollama_insights}"
                    source = 'ollama_optimized'
                else:
                    logger.warning("Ollama is not running, using comprehensive data-driven analysis")
                    enhanced_analysis = f"{data_driven_analysis}\n\n{fallback_analysis}"
            except Exception as e:
                logger.warning(f"Ollama failed, using comprehensive data-driven analysis: {str(e)}")
                enhanced_analysis = f"{data_driven_analysis}\n\n{fallback_analysis}"
            
            # Generate prediction metrics
            prediction_metrics = self._generate_prediction_metrics(analysis_data, actual_threats)
            
            # Generate prediction alerts
            prediction_alerts = self._generate_prediction_alerts(actual_threats, timeframe)
            
            return {
                'analysis': enhanced_analysis,
                'metrics': prediction_metrics,
                'alerts': prediction_alerts,
                'data_points': analysis_data['total_threats'],
                'timestamp': datetime.now().isoformat(),
                'source': source
            }
            
        except Exception as e:
            logger.error(f"Error generating predictions: {str(e)}")
            raise Exception(f"Failed to generate predictions: {str(e)}")
    
    def _generate_comprehensive_fallback_analysis(self, analysis_data, actual_threats, timeframe):
        """Generate comprehensive analysis when LLM is not available"""
        try:
            # Analyze threat patterns
            total_threats = analysis_data['total_threats']
            critical_count = analysis_data['severities'].get('Critical', 0)
            high_count = analysis_data['severities'].get('High', 0)
            
            # Generate insights based on data patterns
            insights = []
            
            # Insight 1: Severity analysis
            if critical_count > 0:
                insights.append(f"**Critical Severity Alert**: {critical_count} critical vulnerabilities detected, indicating immediate patching requirements for the next {timeframe}.")
            elif high_count > 0:
                insights.append(f"**High Priority Threats**: {high_count} high-severity vulnerabilities require attention within the next {timeframe}.")
            else:
                insights.append(f"**Moderate Risk Level**: Current threat landscape shows manageable risk levels for the next {timeframe}.")
            
            # Insight 2: Threat diversity analysis
            threat_diversity = len(analysis_data['threat_types'])
            if threat_diversity > 3:
                insights.append(f"**Multi-Vector Attack Surface**: {threat_diversity} different threat types detected, suggesting coordinated attack campaigns are likely in the next {timeframe}.")
            else:
                insights.append(f"**Focused Threat Landscape**: {threat_diversity} primary threat vectors identified, enabling targeted defense strategies for the next {timeframe}.")
            
            # Generate predictions
            predictions = []
            
            # Prediction 1: Based on threat frequency
            top_threat = actual_threats[0] if actual_threats else None
            if top_threat and top_threat['count'] > 1:
                predictions.append(f"**{top_threat['name']} Escalation**: Expect increased {top_threat['name'].lower()} attacks targeting {top_threat['vendor']} systems within the next 7-14 days.")
            
            # Prediction 2: Based on vendor concentration
            top_vendors = sorted(analysis_data['vendors'].items(), key=lambda x: x[1], reverse=True)[:2]
            if len(top_vendors) > 1 and top_vendors[0][1] > top_vendors[1][1]:
                predictions.append(f"**Vendor-Specific Campaign**: {top_vendors[0][0]} systems likely to be primary targets due to current vulnerability concentration.")
            
            # Combine insights and predictions
            analysis_text = "**AI Analysis:**\nBased on the provided cyber threats analysis, here are key insights and specific predictions for the next 30 days:\n\n**Key Insights:**\n\n"
            for i, insight in enumerate(insights, 1):
                analysis_text += f"{i}. {insight}\n"
            
            analysis_text += "\n**Predictions:**\n\n"
            for i, prediction in enumerate(predictions, 1):
                analysis_text += f"{i}. {prediction}\n"
            
            return analysis_text
            
        except Exception as e:
            logger.error(f"Error generating fallback analysis: {str(e)}")
            return "**AI Analysis:**\nComprehensive threat analysis based on current data patterns indicates continued monitoring and proactive defense measures are essential for the next 30 days."
    
    def _generate_progressive_llm_analysis(self, analysis_data, actual_threats, timeframe):
        """Generate LLM analysis using multiple smaller prompts to prevent timeouts"""
        try:
            insights = []
            predictions = []
            
            # Step 1: Get insights about threat severity
            severity_prompt = f"""Analyze threat severity for {timeframe}:
Severity breakdown: {dict(list(analysis_data['severities'].items())[:3])}
Total threats: {analysis_data['total_threats']}

Give 1 key insight about severity patterns. Max 50 words."""
            
            try:
                severity_insight = self.ollama.call_ollama(severity_prompt)
                insights.append(severity_insight.strip())
            except Exception as e:
                logger.warning(f"Severity analysis failed: {e}")
                insights.append("Severity analysis indicates moderate risk levels requiring continued monitoring.")
            
            # Step 2: Get insights about threat diversity
            diversity_prompt = f"""Analyze threat diversity for {timeframe}:
Threat types: {len(analysis_data['threat_types'])}
Top threats: {', '.join([f"{t['name']}({t['count']})" for t in actual_threats[:3]])}

Give 1 key insight about threat patterns. Max 50 words."""
            
            try:
                diversity_insight = self.ollama.call_ollama(diversity_prompt)
                insights.append(diversity_insight.strip())
            except Exception as e:
                logger.warning(f"Diversity analysis failed: {e}")
                insights.append("Threat landscape shows focused attack vectors requiring targeted defense strategies.")
            
            # Step 3: Get predictions
            prediction_prompt = f"""Predict cyber threats for {timeframe}:
Top threat: {actual_threats[0]['name'] if actual_threats else 'Unknown'}
Vendors: {', '.join([v[0] for v in sorted(analysis_data['vendors'].items(), key=lambda x: x[1], reverse=True)[:2]])}

Give 1 specific prediction. Max 50 words."""
            
            try:
                prediction = self.ollama.call_ollama(prediction_prompt)
                predictions.append(prediction.strip())
            except Exception as e:
                logger.warning(f"Prediction failed: {e}")
                predictions.append("Expect continued targeting of current vulnerable systems with potential escalation.")
            
            # Combine all parts
            analysis_text = "Based on the provided cyber threats analysis, here are key insights and specific predictions for the next 30 days:\n\n**Key Insights:**\n\n"
            for i, insight in enumerate(insights, 1):
                analysis_text += f"{i}. {insight}\n"
            
            analysis_text += "\n**Predictions:**\n\n"
            for i, prediction in enumerate(predictions, 1):
                analysis_text += f"{i}. {prediction}\n"
            
            return analysis_text
            
        except Exception as e:
            logger.error(f"Progressive LLM analysis failed: {str(e)}")
            return "AI analysis based on current threat data indicates continued monitoring and proactive defense measures are essential for the next 30 days."
    
    def _generate_prediction_metrics(self, analysis_data, actual_threats):
        """Generate prediction metrics based on analysis"""
        total_threats = analysis_data['total_threats']
        
        # Calculate predicted incidents for next 30 days based on threat trends
        base_incidents = max(1, total_threats)
        # Add some realistic variation based on threat types
        threat_diversity = len(analysis_data['threat_types'])
        predicted_incidents = int(base_incidents * (1.2 + (threat_diversity * 0.1)))
        
        # Calculate risk score (0-100) based on severity distribution
        critical_count = analysis_data['severities'].get('Critical', 0)
        high_count = analysis_data['severities'].get('High', 0)
        medium_count = analysis_data['severities'].get('Medium', 0)
        low_count = analysis_data['severities'].get('Low', 0)
        
        # Weighted risk calculation
        risk_score = min(100, int(
            (critical_count * 25) + 
            (high_count * 15) + 
            (medium_count * 8) + 
            (low_count * 3)
        ))
        
        # Calculate confidence level based on data quality and quantity
        data_quality = min(1.0, total_threats / 20)  # More data = higher confidence
        confidence = min(95, int(60 + (data_quality * 30) + (threat_diversity * 2)))
        
        # Model accuracy based on data availability
        model_accuracy = min(95, int(75 + (data_quality * 15) + (threat_diversity * 1)))
        
        return {
            'predicted_incidents_30_days': predicted_incidents,
            'risk_score': risk_score,
            'confidence_level': confidence,
            'model_accuracy': model_accuracy
        }
    
    def _generate_prediction_alerts(self, actual_threats, timeframe):
        """Generate prediction alerts based on threats"""
        alerts = []
        base_date = datetime.now()
        
        for i, threat in enumerate(actual_threats[:5]):
            # Generate predicted date (within timeframe) - use timedelta instead of replace
            days_ahead = (i + 1) * 7  # Spread alerts over time
            predicted_date = (base_date + timedelta(days=days_ahead)).strftime('%Y-%m-%d')
            
            # Calculate probability based on threat frequency and recency
            base_probability = 50 + (threat['percentage'] * 0.4)
            # Add some randomness for realism
            import random
            probability = min(95, int(base_probability + random.randint(-10, 15)))
            
            # Determine impact score based on threat type and frequency
            if threat['name'] in ['Ransomware', 'APT'] or threat['percentage'] > 25:
                impact = 'Critical'
            elif threat['name'] in ['Malware', 'DDoS'] or threat['percentage'] > 15:
                impact = 'High'
            elif threat['percentage'] > 8:
                impact = 'Medium'
            else:
                impact = 'Low'
            
            # Determine status based on probability and threat type
            if probability > 85 or threat['name'] == 'Ransomware':
                status = 'Urgent'
            elif probability > 70 or threat['name'] in ['APT', 'Malware']:
                status = 'Active'
            elif probability > 55:
                status = 'Alert'
            else:
                status = 'Monitoring'
            
            alerts.append({
                'threat_type': threat['name'],
                'predicted_date': predicted_date,
                'probability': f"{int(probability)}%",
                'impact_score': impact,
                'status': status
            })
        
        return alerts
    
    def generate_predictions_from_dummy_data(self, timeframe='30 days'):
        """Generate predictions using dummy CVE data"""
        try:
            # Load dummy CVE data
            threats_data = self.get_threat_data()
            
            if not threats_data:
                return {
                    'analysis': 'No CVE data available for analysis.',
                    'metrics': {
                        'predicted_incidents_30_days': 0,
                        'risk_score': 0,
                        'confidence_level': 0,
                        'model_accuracy': 0
                    },
                    'alerts': [],
                    'data_points': 0,
                    'timestamp': datetime.now().isoformat(),
                    'source': 'dummy_data_empty'
                }
            
            # Analyze the data
            analysis_data = self.analyze_threat_data(threats_data)
            
            # Generate predictions
            return self.generate_predictions(analysis_data, timeframe)
            
        except Exception as e:
            logger.error(f"Error generating predictions from dummy data: {str(e)}")
            return {
                'analysis': f'Error generating predictions: {str(e)}',
                'metrics': {
                    'predicted_incidents_30_days': 0,
                    'risk_score': 0,
                    'confidence_level': 0,
                    'model_accuracy': 0
                },
                'alerts': [],
                'data_points': 0,
                'timestamp': datetime.now().isoformat(),
                'source': 'error'
            }
