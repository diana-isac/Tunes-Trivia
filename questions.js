(function initQuestions(globalObject) {
  const QUESTIONS = [
    {
      type: "trivia",
      prompt: 'Which artist is known as the "King of Pop"?',
      options: ["Prince", "Elvis Presley", "Michael Jackson", "Bruno Mars"],
      answer: 2
    },
    {
      type: "trivia",
      prompt: 'Which artist is known for the album "UTOPIA"?',
      options: ["Drake", "Travis Scott", "Kanye West", "Future"],
      answer: 1
    },
    {
      type: "trivia",
      prompt: 'Which artist became famous at a very young age with "Ocean Eyes"?',
      options: ["Olivia Rodrigo", "Billie Eilish", "Ariana Grande", "Sabrina Carpenter"],
      answer: 1
    },
    {
      type: "trivia",
      prompt: "What is Drake's real first name?",
      options: ["Jordan", "Daniel", "Marcus", "Aubrey"],
      answer: 3
    },
    {
      type: "trivia",
      prompt: "Which artist used to post song covers on YouTube as a teenager?",
      options: ["Shawn Mendes", "Justin Bieber", "Charlie Puth", "Ed Sheeran"],
      answer: 1
    },
    {
      type: "trivia",
      prompt: "Which song helped Olivia Rodrigo win multiple Grammys at a young age?",
      options: ["good 4 u", "traitor", "drivers license", "deja vu"],
      answer: 2
    },
    {
      type: "trivia",
      prompt: "Which artist became a billionaire mainly through a beauty brand, not music?",
      options: ["Rihanna", "Taylor Swift", "Beyonce", "Lady Gaga"],
      answer: 0
    },
    {
      type: "trivia",
      prompt: 'Which song won "Song of the Year" at the 2024 Grammys?',
      options: ["Anti-Hero", "Flowers", "Kill Bill", "As It Was"],
      answer: 1
    },
    {
      type: "trivia",
      prompt: "Which artist worked at a fast-food restaurant before becoming famous?",
      options: ["Drake", "Nicki Minaj", "Travis Scott", "The Weeknd"],
      answer: 1
    },
    {
      type: "trivia",
      prompt: "Which artist almost became a professional basketball player?",
      options: ["Travis Scott", "J. Cole", "Lil Uzi Vert", "A$AP Rocky"],
      answer: 1
    }
  ];

  if (typeof module !== "undefined" && module.exports) {
    module.exports = { QUESTIONS };
  }

  globalObject.TUNES_TRIVIA_QUESTIONS = QUESTIONS;
})(typeof globalThis !== "undefined" ? globalThis : window);
