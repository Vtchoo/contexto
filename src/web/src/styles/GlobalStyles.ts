import { createGlobalStyle } from 'styled-components'

export const GlobalStyles = createGlobalStyle`
  :root {
    /* Light theme colors */
    --bg-color: #ffffff;
    --text-color: #1a1a1a;
    --secondary-text: #666666;
    --border-color: #e0e0e0;
    --input-bg: #f5f5f5;
    --button-bg: #007bff;
    --button-hover: #0056b3;
    --button-text: #ffffff;
    --green: #28a745;
    --yellow: #ffc107;
    --red: #dc3545;
    --orange: #fd7e14;
    --purple: #6f42c1;
    --shadow: rgba(0, 0, 0, 0.1);
    --modal-bg: rgba(0, 0, 0, 0.5);
    --card-bg: #ffffff;
    --hover-bg: #f8f9fa;
  }

  [data-theme='dark'] {
    /* Dark theme colors */
    --bg-color: #1a1a1a;
    --text-color: #ffffff;
    --secondary-text: #cccccc;
    --border-color: #333333;
    --input-bg: #2d2d2d;
    --button-bg: #0d6efd;
    --button-hover: #0b5ed7;
    --button-text: #ffffff;
    --green: #198754;
    --yellow: #fd7e14;
    --red: #dc3545;
    --orange: #fd7e14;
    --purple: #6f42c1;
    --shadow: rgba(0, 0, 0, 0.3);
    --modal-bg: rgba(0, 0, 0, 0.7);
    --card-bg: #2d2d2d;
    --hover-bg: #333333;
  }

  * {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
  }

  body {
    /* font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif; */
    font-family: 'Nunito', sans-serif;
    line-height: 1.5;
    color: var(--text-color);
    background-color: var(--bg-color);
    font-size: 16px;
    overflow-x: hidden;
    transition: background-color 0.3s ease, color 0.3s ease;
  }

  #root {
    min-height: 100vh;
    display: flex;
    flex-direction: column;
  }

  /* Scrollbar styling */
  ::-webkit-scrollbar {
    width: 8px;
  }

  ::-webkit-scrollbar-track {
    background: var(--input-bg);
  }

  ::-webkit-scrollbar-thumb {
    background: var(--border-color);
    border-radius: 4px;
  }

  ::-webkit-scrollbar-thumb:hover {
    background: var(--secondary-text);
  }

  /* Button reset */
  button {
    border: none;
    background: none;
    cursor: pointer;
    font-family: inherit;
    font-size: inherit;
    color: inherit;
  }

  /* Input reset */
  input {
    border: none;
    outline: none;
    font-family: inherit;
    font-size: inherit;
    background: none;
    color: inherit;
  }

  /* Link reset */
  a {
    color: inherit;
    text-decoration: none;
  }

  /* Focus styles */
  button:focus-visible,
  input:focus-visible,
  a:focus-visible {
    outline: 2px solid var(--button-bg);
    outline-offset: 2px;
  }

  /* Selection styles */
  ::selection {
    background: var(--button-bg);
    color: var(--button-text);
  }

  /* Animation keyframes */
  @keyframes fadeIn {
    from {
      opacity: 0;
      transform: translateY(10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  @keyframes slideIn {
    from {
      transform: translateX(-100%);
    }
    to {
      transform: translateX(0);
    }
  }

  @keyframes pulse {
    0%, 100% {
      opacity: 1;
    }
    50% {
      opacity: 0.5;
    }
  }

  @keyframes shake {
    0%, 100% {
      transform: translateX(0);
    }
    25% {
      transform: translateX(-5px);
    }
    75% {
      transform: translateX(5px);
    }
  }

  /* Utility classes */
  .fade-in {
    animation: fadeIn 0.3s ease-out;
  }

  .slide-in {
    animation: slideIn 0.3s ease-out;
  }

  .pulse {
    animation: pulse 1s ease-in-out infinite;
  }

  .shake {
    animation: shake 0.5s ease-in-out;
  }

  /* Typography */
  h1, h2, h3, h4, h5, h6 {
    font-weight: 600;
    line-height: 1.2;
    margin: 0;
  }

  h1 {
    font-size: 2.5rem;
    font-weight: 700;
  }

  h2 {
    font-size: 2rem;
  }

  h3 {
    font-size: 1.5rem;
  }

  p {
    margin: 0;
  }

  /* Mobile responsiveness */
  @media (max-width: 768px) {
    body {
      font-size: 14px;
    }

    h1 {
      font-size: 2rem;
    }

    h2 {
      font-size: 1.5rem;
    }

    h3 {
      font-size: 1.25rem;
    }
  }
`
