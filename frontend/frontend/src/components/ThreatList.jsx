import React, { useEffect, useState } from "react";

const ThreatList = () => {
  const [threats, setThreats] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("http://127.0.0.1:8000/api/threat/")
      .then((response) => {
        if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status}`);
        }
        return response.json();
      })
      .then((data) => {
        setThreats(data);
        setLoading(false);
      })
      .catch((error) => {
        console.error("Error fetching threats:", error);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return <p>Loading threats...</p>;
  }

  if (threats.length === 0) {
    return <p>No threats found.</p>;
  }

  return (
    <div>
      <h2>Threat Intelligence Data</h2>
      <ul>
        {threats.map((threat, index) => (
          <li key={index}>
            <strong>{threat.source}</strong> - {threat.threat_type} <br />
            Severity: {threat.severity} <br />
            Description: {threat.description || "N/A"} <br />
            Confidence: {threat.confidence_level || "Unknown"} <br />
            Link:{" "}
            {threat.link ? (
              <a href={threat.link} target="_blank" rel="noopener noreferrer">
                View
              </a>
            ) : (
              "N/A"
            )}
            <hr />
          </li>
        ))}
      </ul>
    </div>
  );
};

export default ThreatList;
