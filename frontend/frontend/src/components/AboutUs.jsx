import React from 'react';

const AboutUs = () => {
  return (
    <div className="about-page">
      <div className="about-container">
        {/* Hero Section */}
        <section className="about-hero">
          <h1 className="about-title">About Our Platform</h1>
          <p className="about-subtitle">
            Advanced Cyber Threat Intelligence & Anomaly Detection Platform
          </p>
        </section>

        {/* Mission Section */}
        <section className="about-section">
          <h2 className="section-title">Our Mission</h2>
          <p className="section-content">
            We are dedicated to providing comprehensive cyber threat intelligence and anomaly detection 
            capabilities to help organizations identify, analyze, and respond to cybersecurity threats 
            in real-time. Our platform combines cutting-edge technology with intuitive visualization 
            to make complex threat data accessible and actionable.
          </p>
        </section>

        {/* What We Do Section */}
        <section className="about-section">
          <h2 className="section-title">What We Do</h2>
          <div className="features-grid">
            <div className="feature-card">
              <div className="feature-icon">🛡️</div>
              <h3>Threat Intelligence</h3>
              <p>Real-time monitoring and analysis of cyber threats across multiple sectors and attack vectors.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">📊</div>
              <h3>Data Visualization</h3>
              <p>Interactive charts, maps, and dashboards to make complex threat data easily understandable.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">🔍</div>
              <h3>Anomaly Detection</h3>
              <p>Advanced algorithms to identify unusual patterns and potential security breaches.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">📈</div>
              <h3>Risk Assessment</h3>
              <p>Comprehensive risk scoring and exposure analysis for different industry sectors.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">🚨</div>
              <h3>Alert System</h3>
              <p>Proactive notifications for critical threats and security incidents.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">📋</div>
              <h3>Reporting</h3>
              <p>Detailed reports and analytics for compliance and decision-making.</p>
            </div>
          </div>
        </section>

        {/* Technology Stack */}
        <section className="about-section">
          <h2 className="section-title">Technology Stack</h2>
          <div className="tech-stack">
            <div className="tech-category">
              <h3>Frontend</h3>
              <div className="tech-tags">
                <span className="tech-tag">React 18</span>
                <span className="tech-tag">Vite</span>
                <span className="tech-tag">Chart.js</span>
                <span className="tech-tag">CSS3</span>
              </div>
            </div>
            <div className="tech-category">
              <h3>Data Visualization</h3>
              <div className="tech-tags">
                <span className="tech-tag">Chart.js</span>
                <span className="tech-tag">React-ChartJS-2</span>
                <span className="tech-tag">Interactive Maps</span>
                <span className="tech-tag">Real-time Updates</span>
              </div>
            </div>
            <div className="tech-category">
              <h3>Security Features</h3>
              <div className="tech-tags">
                <span className="tech-tag">Threat Intelligence</span>
                <span className="tech-tag">Anomaly Detection</span>
                <span className="tech-tag">Risk Scoring</span>
                <span className="tech-tag">KEV Monitoring</span>
              </div>
            </div>
          </div>
        </section>

        {/* Meet the Team Section */}
        <section className="about-section">
          <h2 className="section-title">Meet the Team</h2>
          <p className="section-content">
            Our team consists of cybersecurity experts, data scientists, and software engineers 
            dedicated to advancing threat intelligence capabilities.
          </p>
          <div className="team-grid">
            <div className="team-member">
              <div className="member-avatar">
                <div className="avatar-placeholder">👤</div>
              </div>
              <h3 className="member-name">[Your Name]</h3>
              <p className="member-role">Lead Developer & Security Analyst</p>
              <p className="member-bio">
                [Add your bio here - background, expertise, and role in the project]
              </p>
            </div>
            <div className="team-member">
              <div className="member-avatar">
                <div className="avatar-placeholder">👤</div>
              </div>
              <h3 className="member-name">[Team Member 2]</h3>
              <p className="member-role">Data Scientist</p>
              <p className="member-bio">
                [Add team member bio here - focus on data analysis and threat intelligence]
              </p>
            </div>
            <div className="team-member">
              <div className="member-avatar">
                <div className="avatar-placeholder">👤</div>
              </div>
              <h3 className="member-name">[Team Member 3]</h3>
              <p className="member-role">UI/UX Designer</p>
              <p className="member-bio">
                [Add team member bio here - focus on user experience and interface design]
              </p>
            </div>
            <div className="team-member">
              <div className="member-avatar">
                <div className="avatar-placeholder">👤</div>
              </div>
              <h3 className="member-name">[Team Member 4]</h3>
              <p className="member-role">Cybersecurity Expert</p>
              <p className="member-bio">
                [Add team member bio here - focus on security research and threat analysis]
              </p>
            </div>
          </div>
        </section>

        {/* Project Information */}
        <section className="about-section">
          <h2 className="section-title">Project Information</h2>
          <div className="project-info">
            <div className="info-item">
              <h3>Project Name</h3>
              <p>Cyber Threat Intelligence & Anomaly Detection Platform</p>
            </div>
            <div className="info-item">
              <h3>Course</h3>
              <p>INFX 490 - Final Project</p>
            </div>
            <div className="info-item">
              <h3>Year</h3>
              <p>2025</p>
            </div>
            <div className="info-item">
              <h3>Focus Areas</h3>
              <p>Cybersecurity, Data Visualization, Threat Intelligence, Risk Assessment</p>
            </div>
          </div>
        </section>

        {/* Contact Section */}
        <section className="about-section">
          <h2 className="section-title">Get in Touch</h2>
          <p className="section-content">
            Interested in learning more about our platform or collaborating on cybersecurity research? 
            We'd love to hear from you.
          </p>
          <div className="contact-info">
            <div className="contact-item">
              <span className="contact-label">Email:</span>
              <span className="contact-value">[your-email@university.edu]</span>
            </div>
            <div className="contact-item">
              <span className="contact-label">University:</span>
              <span className="contact-value">[Your University Name]</span>
            </div>
            <div className="contact-item">
              <span className="contact-label">Department:</span>
              <span className="contact-value">Information Studies</span>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default AboutUs;
