import type { SkillGroup } from "../types";

export const profile = {
  name: "Lakindu De Silva",
  role: "Quality Engineering Intern",
  headline: "I test the paths users take — and the edge cases they don't.",
  summary: "Information Technology for Business undergraduate building practical depth across manual testing, automation, APIs, performance, security, and accessible software experiences.",
  email: "lakindudesilva007@gmail.com",
  github: "https://github.com/LakinduQA",
  linkedin: "https://www.linkedin.com/in/lakindu-de-silva",
  medium: "https://medium.com/@lakindudesilva007",
  website: "https://lakinduqa.github.io/",
};

export const about = [
  "I am an Information Technology for Business undergraduate who approaches quality as an engineering discipline, not a final checkpoint.",
  "My work combines exploratory thinking, repeatable test design, automation, and clear evidence so teams can understand risk and ship with confidence.",
  "I learn by building, breaking, investigating, and documenting real systems — then sharing what I learn with the wider QA community.",
];

export const skillGroups: SkillGroup[] = [
  {
    title: "Quality practice",
    skills: ["Requirement analysis", "Test planning", "Test case design", "Manual testing", "Exploratory testing", "Regression testing", "Defect lifecycle", "Root cause analysis"],
  },
  {
    title: "Automation & APIs",
    skills: ["Playwright", "JavaScript", "TypeScript", "Postman", "API testing", "Accessibility testing", "GitHub Actions", "CI/CD integration"],
  },
  {
    title: "Performance & security",
    skills: ["JMeter", "Load testing", "Stress testing", "Burp Suite", "OWASP Top 10", "Security testing", "Database testing", "SQL"],
  },
];

export const experience = [
  {
    role: "Quality Engineering Intern",
    organization: "Codimite",
    period: "Current",
    description: "Growing practical quality engineering experience while strengthening technical fundamentals across the software delivery lifecycle.",
  },
  {
    role: "Independent QA project work",
    organization: "Portfolio projects",
    period: "Ongoing",
    description: "Designing and documenting end-to-end, API, performance, security, accessibility, and exploratory testing work across real-world systems.",
  },
];

export const education = [
  {
    qualification: "BSc (Hons) Information Technology for Business",
    institution: "Coventry University, UK — delivered through NIBM Sri Lanka",
    period: "2024–2028",
    detail: "Current portfolio source lists a 4.0 GPA.",
  },
];

export const sectionLabels = {
  home: "Home",
  about: "About",
  skills: "Skills",
  experience: "Experience",
  education: "Education",
  projects: "Projects",
  writing: "Writing",
  resume: "Resume",
  contact: "Contact",
} as const;
