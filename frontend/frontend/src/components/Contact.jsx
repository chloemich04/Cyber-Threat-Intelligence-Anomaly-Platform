import React, { useState } from 'react';

const Contact = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: ''
  });

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    // Handle form submission here
    alert('Thank you for your message! We will get back to you soon.');
    setFormData({ name: '', email: '', subject: '', message: '' });
  };

  return (
    <div className="contact-page">
      <div className="contact-container">
        {/* Hero Section */}
        <section className="contact-hero">
          <h1 className="contact-title">Get in Touch</h1>
          <p className="contact-subtitle">
            Have questions about our cyber threat intelligence platform? 
            We'd love to hear from you.
          </p>
        </section>

        <div className="contact-content">
          {/* Contact Information */}
          <section className="contact-info-section">
            <h2 className="section-title">Contact Information</h2>
            
            <div className="contact-methods">
              <div className="contact-method">
                <div className="method-icon">🔗</div>
                <div className="method-content">
                  <h3>LinkedIn</h3>
                  <p>Connect with our team on LinkedIn</p>
                  <ul className="linkedin-list">
                    <li>
                      <a href="https://www.linkedin.com/in/lydia-martin-4117b734a/" target="_blank" rel="noopener noreferrer" className="contact-link">
                        Lydia Martin
                      </a>
                    </li>
                    <li>
                      <a href="https://www.linkedin.com/in/chloe-robinson-a90b3632a/" target="_blank" rel="noopener noreferrer" className="contact-link">
                        Chloe Robinson
                      </a>
                    </li>
                    <li>
                      <a href="https://www.linkedin.com/in/akhila-dhatrak-a23a49230/" target="_blank" rel="noopener noreferrer" className="contact-link">
                        Akhila Dhatrak
                      </a>
                    </li>
                    <li>
                      <a href="https://www.linkedin.com/in/dhruv-patel-3b4041305/?utm_source=share_via&utm_content=profile&utm_medium=member_ios" target="_blank" rel="noopener noreferrer" className="contact-link">
                        Dhruv Patel
                      </a>
                    </li>
                  </ul>
                </div>
              </div>

              <div className="contact-method">
                <div className="method-icon">🏢</div>
                <div className="method-content">
                  <h3>University</h3>
                  <p>Information Studies Department</p>
                  <span className="contact-detail">University of Louisiana at Lafayette</span>
                </div>
              </div>

              <div className="contact-method">
                <div className="method-icon">📚</div>
                <div className="method-content">
                  <h3>Course</h3>
                  <p>INFX/CMPS 490 - Final Project</p>
                  <span className="contact-detail">2025 Academic Year</span>
                </div>
              </div>
            </div>
          </section>

          {/* Contact Form */}
          <section className="contact-form-section">
            <h2 className="section-title">Send us a Message</h2>
            <form className="contact-form" onSubmit={handleSubmit}>
              <div className="form-group">
                <label htmlFor="name" className="form-label">Name *</label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  className="form-input"
                  required
                  placeholder="Your full name"
                />
              </div>

              <div className="form-group">
                <label htmlFor="email" className="form-label">Email *</label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className="form-input"
                  required
                  placeholder="your.email@university.edu"
                />
              </div>

              <div className="form-group">
                <label htmlFor="message" className="form-label">Message *</label>
                <textarea
                  id="message"
                  name="message"
                  value={formData.message}
                  onChange={handleChange}
                  className="form-textarea"
                  required
                  rows="6"
                  placeholder="Tell us about your inquiry, feedback, or how we can help you..."
                />
              </div>

              <button type="submit" className="form-submit">
                Send Message
              </button>
            </form>
          </section>

          {/* FAQ Section */}
          <section className="faq-section">
            <h2 className="section-title">Frequently Asked Questions</h2>
            
            <div className="faq-list">
              <div className="faq-item">
                <h3 className="faq-question">What is this platform used for?</h3>
                <p className="faq-answer">
                  This is a cyber threat intelligence and anomaly detection platform designed to help 
                  organizations monitor, analyze, and respond to cybersecurity threats in real-time.
                </p>
              </div>


              <div className="faq-item">
                <h3 className="faq-question">How can I contribute to this project?</h3>
                <p className="faq-answer">
                  We welcome collaboration and feedback! Please contact us through the form above or 
                  email us directly to discuss potential contributions or research partnerships.
                </p>
              </div>

              <div className="faq-item">
                <h3 className="faq-question">What technologies are used?</h3>
                <p className="faq-answer">
                  The platform is built with React, Chart.js for data visualization, and modern web 
                  technologies. See our About Us page for a complete technology stack overview.
                </p>
              </div>

              <div className="faq-item">
                <h3 className="faq-question">Can I use this for my own research?</h3>
                <p className="faq-answer">
                  This platform is designed for educational and research purposes. Please contact us 
                  to discuss licensing and usage terms for your specific research needs.
                </p>
              </div>
            </div>
          </section>

          {/* Response Time */}
          <section className="response-section">
            <h2 className="section-title">Response Time</h2>
            <div className="response-info">
              <div className="response-item">
                <span className="response-label">General Inquiries:</span>
                <span className="response-time">24-48 hours</span>
              </div>
              <div className="response-item">
                <span className="response-label">Technical Support:</span>
                <span className="response-time">12-24 hours</span>
              </div>
              <div className="response-item">
                <span className="response-label">Research Collaboration:</span>
                <span className="response-time">3-5 business days</span>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

export default Contact;
