// The question pool. Each game picks QUESTIONS_PER_GAME of these at random,
// and the choices are shuffled, so every game feels different.
// "answer" is the number of the correct choice as written here:
// 0 = first choice, 1 = second, 2 = third, 3 = fourth.
const QUESTIONS = [
  {
    question: "What is the name of Halifax's famous star-shaped fort?",
    choices: ["Fort York", "Citadel Hill", "Fort Henry", "Point Pleasant"],
    answer: 1
  },
  {
    question: "Halifax was hit by a huge explosion in which year?",
    choices: ["1867", "1912", "1917", "1945"],
    answer: 2
  },
  {
    question: "Victims of which famous ship are buried in Halifax?",
    choices: ["Lusitania", "Bluenose", "Mayflower", "Titanic"],
    answer: 3
  },
  {
    question: "Which dish is the official food of Halifax?",
    choices: ["The donair", "Poutine", "Lobster roll", "Fish and chips"],
    answer: 0
  },
  {
    question: "Which hotel company is Moxy part of?",
    choices: ["Hilton", "Marriott", "Hyatt", "IHG"],
    answer: 1
  },
  {
    question: "Which city sits right across the harbour from Halifax?",
    choices: ["Dartmouth", "Truro", "Moncton", "Lunenburg"],
    answer: 0
  },
  {
    question: "In which year was Halifax founded?",
    choices: ["1608", "1749", "1812", "1867"],
    answer: 1
  },
  {
    question: "The Bluenose schooner from Nova Scotia appears on which Canadian coin?",
    choices: ["Penny", "Nickel", "Dime", "Loonie"],
    answer: 2
  },
  {
    question: "Pier 21 on the Halifax waterfront is Canada's museum of what?",
    choices: ["Immigration", "Shipbuilding", "Hockey", "Fishing"],
    answer: 0
  },
  {
    question: "Where do guests check in at a Moxy hotel?",
    choices: ["A kiosk", "The bar", "The lobby desk", "Their phone only"],
    answer: 1
  },
  {
    question: "Halifax is the capital of which province?",
    choices: ["New Brunswick", "Nova Scotia", "Prince Edward Island", "Newfoundland and Labrador"],
    answer: 1
  },
  {
    question: "What does \"Nova Scotia\" mean in Latin?",
    choices: ["New Scotland", "New Coast", "Sea Land", "Northern Star"],
    answer: 0
  },
  {
    question: "What happens every day at noon on Citadel Hill?",
    choices: ["A bell rings", "A cannon is fired", "A flag is raised", "A bagpiper plays"],
    answer: 1
  },
  {
    question: "Which famous brewery was founded in Halifax in 1820?",
    choices: ["Molson", "Labatt", "Alexander Keith's", "Sleeman"],
    answer: 2
  },
  {
    question: "Peggy's Cove, near Halifax, is famous for its...",
    choices: ["Castle", "Lighthouse", "Waterfall", "Bridge"],
    answer: 1
  },
  {
    question: "Nova Scotia's Bay of Fundy has the world's highest...",
    choices: ["Waves", "Cliffs", "Tides", "Icebergs"],
    answer: 2
  },
  {
    question: "The 1917 Halifax Explosion happened when two ___ collided.",
    choices: ["Trains", "Ships", "Planes", "Trucks"],
    answer: 1
  },
  {
    question: "Every year Halifax sends a giant Christmas tree to which city to say thanks for its help after the 1917 explosion?",
    choices: ["New York", "Boston", "London", "Montreal"],
    answer: 1
  },
  {
    question: "Which hockey superstar grew up in Cole Harbour, just outside Halifax?",
    choices: ["Wayne Gretzky", "Connor McDavid", "Sidney Crosby", "Mario Lemieux"],
    answer: 2
  },
  {
    question: "Halifax is named after a British...",
    choices: ["King", "Earl", "Admiral", "Ship"],
    answer: 1
  },
  {
    question: "What is Nova Scotia's provincial flower?",
    choices: ["Mayflower", "Rose", "Tulip", "Lily"],
    answer: 0
  },
  {
    question: "Nova Scotia's flag is based on the flag of which country?",
    choices: ["Ireland", "England", "Scotland", "France"],
    answer: 2
  },
  {
    question: "Nova Scotia is famous around the world for exporting which seafood?",
    choices: ["Shrimp", "Lobster", "Oysters", "Salmon"],
    answer: 1
  },
  {
    question: "What nickname appears on Nova Scotia licence plates?",
    choices: ["The Bluenose Province", "Canada's Ocean Playground", "The Maritime Gem", "Land of the Tides"],
    answer: 1
  },
  {
    question: "Which university is in Halifax?",
    choices: ["McGill", "Dalhousie", "Queen's", "McMaster"],
    answer: 1
  },
  {
    question: "The first Moxy hotel opened in 2014 in which city?",
    choices: ["New York", "London", "Milan", "Berlin"],
    answer: 2
  },
  {
    question: "Which time zone is Halifax in?",
    choices: ["Eastern", "Atlantic", "Newfoundland", "Central"],
    answer: 1
  },
  {
    question: "Which ocean is Halifax on?",
    choices: ["Pacific", "Arctic", "Atlantic", "Indian"],
    answer: 2
  },
  {
    question: "The Halifax-Dartmouth ferry is known as the oldest saltwater ferry in...",
    choices: ["Canada only", "North America", "The world", "Nova Scotia only"],
    answer: 1
  },
  {
    question: "Halifax Harbour is one of the world's largest...",
    choices: ["Natural harbours", "Cruise terminals", "Fishing fleets", "Man-made harbours"],
    answer: 0
  }
];

// Questions per game, score needed to win (8 out of 10 = 80%),
// and the code to show the front desk.
const QUESTIONS_PER_GAME = 10;

// Seconds for the whole game. When time runs out, unanswered questions count as wrong.
const TIME_LIMIT_SECONDS = 60;
const WIN_SCORE = 8;
const PRIZE_CODE = "MOXY-WIN";

// How many games a guest can play, and how many hours before they get new plays.
const MAX_PLAYS = 3;
const RESET_HOURS = 24;

// One prize per stay: after a win, the guest can't play again for this many days.
const STAY_DAYS = 7;

// What the game says after each answer. One is picked at random each time.
const RIGHT_LINES = [
  "Nailed it!",
  "Look at you go!",
  "Big brain energy.",
  "Local legend status.",
  "Yes! Total pro."
];
const WRONG_LINES = [
  "Oof. Not that one.",
  "Nope! Nice try though.",
  "Swing and a miss.",
  "Close... ish.",
  "Not quite, friend."
];
