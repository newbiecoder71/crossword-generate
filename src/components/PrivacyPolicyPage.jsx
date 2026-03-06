import React from "react";

const sections = [
  {
    title: "Introduction",
    body: [
      'Crossword Generate+ ("the App") is designed to generate crossword puzzles based on topics entered by users. This Privacy Policy explains how information is handled when you use the App.',
      "We are committed to protecting your privacy and being transparent about how information is used.",
    ],
  },
  {
    title: "Information We Collect",
    body: [
      "User Input",
      "The App allows users to enter a topic or keyword to generate a crossword puzzle.",
      "Examples of input include topics, words, and phrases entered by the user.",
      "This information is used only to generate crossword puzzle content and is processed temporarily.",
      "The App does not require user accounts and does not intentionally collect personal information.",
    ],
  },
  {
    title: "Artificial Intelligence Processing",
    body: [
      "Crossword Generate+ uses artificial intelligence services to generate crossword puzzles and clues based on the topic entered by the user.",
      "When a user enters a topic, the topic may be sent to an AI processing service. The AI service generates crossword words and clues, and the generated content is returned to the App.",
      "This processing occurs only to generate puzzle content requested by the user.",
      "User input is not used for advertising purposes.",
    ],
  },
  {
    title: "Local Device Storage",
    body: [
      "The App stores certain data locally on the user's device to improve gameplay.",
      "This includes the user's highest score and game progress information related to scoring.",
      "This data is stored only on the user's device and is not transmitted to external servers.",
      "If the app is uninstalled, this locally stored data may be removed.",
    ],
  },
  {
    title: "Data Collection and Sharing",
    body: [
      "Crossword Generate+:",
      "Does not sell user data.",
      "Does not share personal information with advertisers.",
      "Does not require login or account creation.",
      "Any data sent to AI services is used only to generate crossword puzzles requested by the user.",
    ],
  },
  {
    title: "Third-Party Services",
    body: [
      "The App may use third-party services that assist with generating crossword content.",
      "These services may process user input temporarily in order to generate puzzle results.",
      "Examples may include artificial intelligence API providers and cloud infrastructure providers used for processing requests.",
      "These services operate under their own privacy policies.",
    ],
  },
  {
    title: "Data Security",
    body: [
      "We take reasonable steps to protect information processed by the App. However, no system is completely secure, and we cannot guarantee absolute security.",
    ],
  },
  {
    title: "Children's Privacy",
    body: [
      "Crossword Generate+ is not directed toward children under the age of 13.",
      "The App does not knowingly collect personal information from children.",
      "If you believe that a child has provided personal information through the App, please contact us and we will address the issue.",
    ],
  },
  {
    title: "Changes to This Privacy Policy",
    body: [
      'This Privacy Policy may be updated from time to time. When updates occur, the "Last Updated" date at the top of this page will be revised.',
    ],
  },
  {
    title: "Contact Information",
    body: [
      "If you have any questions about this Privacy Policy, please contact:",
      "Developer: Crossword Generate+",
      "Email: manesjim@yahoo.com",
    ],
  },
];

export default function PrivacyPolicyPage({ onBack }) {
  return (
    <div className="privacy-page">
      <div className="privacy-card">
        <button className="privacy-back-btn" onClick={onBack}>
          Back
        </button>
        <h1>Privacy Policy</h1>
        <p className="privacy-subtitle">
          <strong>Crossword Generate+</strong>
          <br />
          Last Updated: March 6, 2026
        </p>

        {sections.map((section) => (
          <section key={section.title} className="privacy-section">
            <h2>{section.title}</h2>
            {section.body.map((line) => (
              <p key={`${section.title}-${line}`}>{line}</p>
            ))}
          </section>
        ))}
      </div>
    </div>
  );
}

