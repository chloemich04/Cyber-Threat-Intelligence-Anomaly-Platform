import React from 'react';

const AboutUs = () => {
  return (
    <div className="about-page">
      <div className="about-container">
        {/* Hero Section */}
        <section className="about-hero">
          <h1 className="about-title">About Our Platform</h1>
          <p className="about-subtitle">
            All about our mission, team, and the technology behind our cyber threat intelligence platform.
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

        {/* Meet the Team Section */}
        <section className="about-section">
          <h2 className="section-title">Meet the Team</h2>
         
          <div className="team-grid">
            <div className="team-member">
              <div className="member-avatar">
                <img 
                  src="/images/team/Dhruv.png" 
                  alt="Dhruv Patel"
                  className="member-photo"
                  onError={(e) => {
                    e.target.style.display = 'none';
                    e.target.nextSibling.style.display = 'block';
                  }}
                />
                <div className="avatar-placeholder" style={{display: 'none'}}>👤</div>
              </div>
              <h3 className="member-name">Dhruv Patel</h3>
              <p className="member-role">Frontend Developer</p>
              <p className="member-bio">
                Responsible for all frontend development including React components, user interface design, 
                data visualizations, and creating an intuitive user experience for the application.
              </p>
            </div>
            <div className="team-member">
              <div className="member-avatar">
                <img 
                  src="/images/team/chloe-robinson.jpg" 
                  alt="Chloe Robinson"
                  className="member-photo"
                  onError={(e) => {
                    e.target.style.display = 'none';
                    e.target.nextSibling.style.display = 'block';
                  }}
                />
                <div className="avatar-placeholder" style={{display: 'none'}}>👤</div>
              </div>
              <h3 className="member-name">Chloe Robinson</h3>
              <p className="member-role">Backend Developer</p>
              <p className="member-bio">
                Responsible for all backend development including Django API, database management, 
                threat intelligence data processing, and server-side architecture for the application.
              </p>
            </div>
            <div className="team-member">
              <div className="member-avatar">
                <img 
                  src="/images/team/lydia-profile.png" 
                  alt="Lydia Martin"
                  className="member-photo"
                  onError={(e) => {
                    e.target.style.display = 'none';
                    e.target.nextSibling.style.display = 'block';
                  }}
                />
                
              </div>
              <h3 className="member-name">Lydia Martin</h3>
              <p className="member-role">Full Stack Developer</p>
              <p className="member-bio">
                Responsible for both frontend and backend development, integrating various components of the platform,
                and ensuring seamless functionality across the application.
              </p>
            </div>
            <div className="team-member">
              <div className="member-avatar">
                <img 
                  src="/images/team/Akhila.png" 
                  alt="Akhila Dhatrak"
                  className="member-photo"
                  onError={(e) => {
                    e.target.style.display = 'none';
                    e.target.nextSibling.style.display = 'block';
                  }}
                />
              </div>
              <h3 className="member-name">Akhila Dhatrak</h3>
              <p className="member-role">Data Analyst</p>
              <p className="member-bio">
                Responsible for conducting threat research, analyzing and collecting security data, and enhancing the application's data using Databricks and Azure.
              </p>
            </div>
          </div>
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

        
      </div>
    </div>
  );
};

export default AboutUs;
