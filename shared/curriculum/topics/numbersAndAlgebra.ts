import type { Topic } from '../types.js';
import { missingVideo, scene } from './helpers.js';

/**
 * Mathematics topics for the Numbers, Patterns & Early Algebra and Algebra
 * branches. SAMPLE CONTENT; review with subject experts before production use.
 * Balance-game answers are verified arithmetically by curriculum.test.ts.
 */

const BALANCE_COACH = {
  start: 'Tap a number to put it on the scale. When the scale is level, press Check.',
  'round-correct': 'Level! Both sides have the same value.',
  'round-incorrect': 'The scale tipped. Add up each side and try another number.',
  complete: 'You balanced every scale. Great thinking!',
  'complete:perfect': 'Every scale balanced on the first try. Brilliant!',
};

export const NUMBERS_AND_ALGEBRA_TOPICS: Topic[] = [
  /* ------------------------------------------- Level 1 · Adding within 20 */
  {
    id: 'adding-counting-on',
    subjectId: 'mathematics',
    lessonId: 'adding-within-20',
    order: 1,
    title: 'Counting on',
    summary: 'Start at the bigger number and count on to add.',
    objectives: ['Add two numbers by counting on from the bigger one.', 'Use a number line to show adding.'],
    language: 'en',
    icon: 'plus',
    estimatedMinutes: 6,
    watch: {
      video: missingVideo('video-adding-counting-on', 'Counting on'),
      intro: 'You have 8 marbles and find 3 more. How many do you have now? Let us find a quick way to add!',
      explainer: [
        scene('Adding means putting groups together. 8 marbles and 3 more marbles make one bigger group.', { kind: 'icon', icon: 'plus', tone: 'primary' }),
        scene('To count on, start at the bigger number, 8, and count up 3 more: 9, 10, 11.', { kind: 'number-line', from: 0, to: 12, start: 8, jumps: 3 }),
        scene('So 8 + 3 = 11. Starting at the bigger number means fewer jumps to count.', { kind: 'number-line', from: 0, to: 12, start: 8, jumps: 3 }),
        scene('3 + 8 gives the same answer, 11. You can add in any order, so start with the bigger number.', { kind: 'balance', left: '3 + 8', right: '8 + 3', tilt: 0 }),
      ],
      keyIdeas: ['Adding puts groups together.', 'Count on from the bigger number.', '3 + 8 and 8 + 3 both make 11.'],
    },
    play: {
      title: 'Sum Match',
      assessed: true,
      weight: 1,
      game: {
        type: 'concept-match',
        prompt: 'Match each sum to its answer. Count on from the bigger number!',
        leftLabel: 'Sum',
        rightLabel: 'Answer',
        pairs: [
          { id: 'eight-three', left: '8 + 3', right: '11', hint: 'Start at 8 and count on 3: 9, 10, 11.' },
          { id: 'five-two', left: '5 + 2', right: '7', hint: 'Start at 5 and count on 2: 6, 7.' },
          { id: 'three-nine', left: '3 + 9', right: '12', hint: 'Start at the bigger number, 9, and count on 3: 10, 11, 12.' },
          { id: 'six-seven', left: '6 + 7', right: '13', hint: 'Start at 7 and count on 6: 8, 9, 10, 11, 12, 13.' },
          { id: 'four-four', left: '4 + 4', right: '8', hint: 'Start at 4 and count on 4: 5, 6, 7, 8.' },
        ],
      },
      coach: {
        start: 'Tap a sum, then tap its answer.',
        'match-correct': 'Yes! You counted on perfectly.',
        'match-incorrect': 'Not quite. Start at the bigger number and count on.',
        complete: 'All matched! You are a counting-on champion.',
        'complete:perfect': 'No mistakes at all. Super adding!',
      },
    },
    practice: {
      weight: 3,
      questions: [
        {
          id: 'q-nine-four',
          type: 'single-choice',
          prompt: 'What is 9 + 4?',
          options: [
            { id: '12', text: '12' },
            { id: '13', text: '13' },
            { id: '14', text: '14' },
          ],
          correctOptionId: '13',
          hint: 'Start at 9 and count on 4.',
          explanation: 'Start at 9, then count 10, 11, 12, 13. So 9 + 4 = 13.',
        },
        {
          id: 'q-order',
          type: 'true-false',
          prompt: '2 + 8 gives the same answer as 8 + 2.',
          correct: true,
          hint: 'Does the order of adding change how many there are?',
          explanation: 'True! Both make 10. You can add in any order, so start with the bigger number.',
        },
        {
          id: 'q-start-from',
          type: 'single-choice',
          prompt: 'To add 3 + 9 by counting on, which number is best to start from?',
          options: [
            { id: '3', text: '3' },
            { id: '9', text: '9' },
            { id: '12', text: '12' },
          ],
          correctOptionId: '9',
          hint: 'Which number is bigger?',
          explanation: 'Start from 9, the bigger number, and count on 3: 10, 11, 12.',
        },
      ],
    },
    mentor: {
      facts: [
        'Adding means putting groups together to find how many there are altogether.',
        'Counting on: start at the bigger number and count up the smaller number of steps.',
        'Numbers can be added in any order: 3 + 8 = 8 + 3 = 11.',
      ],
      simpler: 'Keep the bigger number in your head, then count up on your fingers for the smaller number.',
      examples: ['You have 6 stickers and get 3 more. Start at 6 and count 7, 8, 9. Now you have 9 stickers! Can you make up your own adding story?'],
      why: 'Starting at the bigger number means you count fewer steps, so there are fewer chances to slip up.',
      hints: {
        watch: 'Look at where the jumps start on the number line.',
        play: 'Find the bigger number in the sum, then count on the smaller one.',
        practice: 'Start at the bigger number and count on.',
        default: 'Start at the bigger number and count on.',
      },
      faq: [
        { keywords: ['count on', 'counting on'], answer: 'Counting on means starting at one number and counting up. For 8 + 3, start at 8 and say 9, 10, 11.' },
        { keywords: ['order', 'swap', 'switch'], answer: 'You can add numbers in any order and get the same answer. 2 + 8 and 8 + 2 are both 10.' },
        { keywords: ['number line'], answer: 'A number line shows numbers in order. Adding is jumping forward along it, one jump for each number you add.' },
      ],
      practice: [
        { question: 'What is 7 + 3?', accept: ['10', 'ten'], explanation: 'Start at 7 and count on 3: 8, 9, 10.' },
        { question: 'What is 5 + 6?', accept: ['11', 'eleven'], explanation: 'Start at 6, the bigger number, and count on 5: 7, 8, 9, 10, 11.' },
      ],
    },
  },
  {
    id: 'adding-number-bonds',
    subjectId: 'mathematics',
    lessonId: 'adding-within-20',
    order: 2,
    title: 'Number pairs that make 10',
    summary: 'Find pairs of numbers that add up to 10.',
    objectives: ['Know the pairs of numbers that make 10.', 'Find the missing partner in a pair that makes 10.'],
    language: 'en',
    icon: 'scale',
    estimatedMinutes: 6,
    watch: {
      video: missingVideo('video-adding-number-bonds', 'Number pairs that make 10'),
      intro: 'Ten fingers and ten toes! Let us find all the ways two numbers can make 10.',
      explainer: [
        scene('Two numbers that add up to 10 are called number bonds to 10. 7 and 3 are a pair: 7 + 3 = 10.', { kind: 'balance', left: '7 + 3', right: '10', tilt: 0 }),
        scene('If you know one number, you can find its partner. Start at 6 and count on to 10: that is 4 jumps.', { kind: 'number-line', from: 0, to: 10, start: 6, jumps: 4 }),
        scene('The pairs are 1 and 9, 2 and 8, 3 and 7, 4 and 6, and 5 and 5.', { kind: 'word-chips', words: ['1 + 9', '2 + 8', '3 + 7', '4 + 6', '5 + 5'] }),
      ],
      keyIdeas: ['Number bonds to 10 are pairs that add up to 10.', 'Count on from a number to 10 to find its partner.', '1 + 9, 2 + 8, 3 + 7, 4 + 6 and 5 + 5 all make 10.'],
    },
    play: {
      title: 'Make 10 Balance',
      assessed: true,
      weight: 1,
      game: {
        type: 'balance',
        unknownLabel: '?',
        rounds: [
          { id: 'seven', left: [7, 'unknown'], right: [10], answer: 3, choices: [2, 3, 4, 5], prompt: 'What number balances 7 + ? = 10?', hint: 'Count on from 7 to 10: 8, 9, 10. How many jumps is that?', explanation: '7 + 3 = 10, so both sides have the same value.' },
          { id: 'four', left: [4, 'unknown'], right: [10], answer: 6, choices: [4, 5, 6, 7], prompt: 'What number balances 4 + ? = 10?', hint: 'Count on from 4 to 10.', explanation: '4 + 6 = 10.' },
          { id: 'eight', left: ['unknown', 8], right: [10], answer: 2, choices: [1, 2, 3, 8], prompt: 'What number balances ? + 8 = 10?', hint: 'How many more does 8 need to make 10?', explanation: '2 + 8 = 10.' },
          { id: 'five', left: [5, 'unknown'], right: [10], answer: 5, choices: [4, 5, 6, 10], prompt: 'What number balances 5 + ? = 10?', hint: 'Which number is its own partner?', explanation: '5 + 5 = 10. Five is its own partner!' },
        ],
      },
      coach: BALANCE_COACH,
    },
    practice: {
      weight: 3,
      questions: [
        {
          id: 'q-partner-six',
          type: 'single-choice',
          prompt: 'Which number goes with 6 to make 10?',
          options: [
            { id: '3', text: '3' },
            { id: '4', text: '4' },
            { id: '5', text: '5' },
          ],
          correctOptionId: '4',
          hint: 'Count on from 6 to 10.',
          explanation: '6 + 4 = 10.',
        },
        {
          id: 'q-nine-one',
          type: 'true-false',
          prompt: '9 + 1 = 10',
          correct: true,
          hint: 'Count on 1 from 9.',
          explanation: 'True! 9 and 1 are a number bond to 10.',
        },
        {
          id: 'q-not-ten',
          type: 'single-choice',
          prompt: 'Which pair does NOT make 10?',
          options: [
            { id: 'three-seven', text: '3 + 7' },
            { id: 'two-eight', text: '2 + 8' },
            { id: 'four-five', text: '4 + 5' },
          ],
          correctOptionId: 'four-five',
          hint: 'Add each pair. Which one is not 10?',
          explanation: '4 + 5 = 9, not 10. 3 + 7 and 2 + 8 both make 10.',
        },
      ],
    },
    mentor: {
      facts: [
        'Number bonds to 10 are pairs of whole numbers that add to 10: 0 and 10, 1 and 9, 2 and 8, 3 and 7, 4 and 6, and 5 and 5.',
        'To find the partner of a number, count on from it to 10.',
        'Pairs that make 10 help with bigger sums. For example, 8 + 5 = 8 + 2 + 3 = 13.',
      ],
      simpler: 'Hold up 10 fingers. If 7 fingers are up, 3 are down. So 7 and 3 make 10.',
      examples: ['If 10 friends play and 6 wear red shirts, the other 4 do not. 6 and 4 make 10! Can you think of another pair?'],
      why: 'The scale balances only when both sides have the same total. With 10 on one side, the two numbers on the other side must add to exactly 10.',
      hints: {
        watch: 'Count the jumps on the number line from the first number up to 10.',
        play: 'Count on from the number you can see up to 10. The number of jumps is the partner.',
        practice: 'Count on to 10 to find the partner.',
        default: 'Count on to 10 to find the partner.',
      },
      faq: [
        { keywords: ['number bond', 'bond', 'pair'], answer: 'A number bond is a pair of numbers that add up to a total. For 10 the pairs are 1 and 9, 2 and 8, 3 and 7, 4 and 6, and 5 and 5.' },
        { keywords: ['partner', 'missing'], answer: 'To find a missing partner, start at the number you know and count on to 10. The number of jumps is the partner.' },
      ],
      practice: [
        { question: 'What goes with 3 to make 10?', accept: ['7', 'seven'], explanation: '3 + 7 = 10.' },
        { question: 'What goes with 8 to make 10?', accept: ['2', 'two'], explanation: '8 + 2 = 10.' },
      ],
    },
  },

  /* ------------------------------------------- Level 2 · Missing Numbers */
  {
    id: 'missing-equals-balance',
    subjectId: 'mathematics',
    lessonId: 'missing-numbers',
    order: 1,
    title: 'The equals sign means balanced',
    summary: 'Discover that = means both sides have the same value.',
    objectives: ['Explain that = means "has the same value as".', 'Tell whether a number sentence is balanced.'],
    language: 'en',
    icon: 'scale',
    estimatedMinutes: 7,
    watch: {
      video: missingVideo('video-missing-equals-balance', 'The equals sign means balanced'),
      intro: 'Is 4 + 5 the same as 3 + 6? A balance scale can tell us!',
      explainer: [
        scene('The equals sign = means "is the same as". It does not mean "the answer comes next".', { kind: 'balance', left: '4 + 5', right: '9', tilt: 0 }),
        scene('Both sides can have sums. 4 + 5 is 9 and 3 + 6 is 9, so 4 + 5 = 3 + 6 is true.', { kind: 'balance', left: '4 + 5', right: '3 + 6', tilt: 0 }),
        scene('If one side is bigger, the scale tips. 7 + 2 is 9 but 5 + 5 is 10, so they are not equal.', { kind: 'balance', left: '7 + 2', right: '5 + 5', tilt: 1 }),
      ],
      keyIdeas: ['= means both sides have the same value.', 'There can be sums on both sides of =.', 'If the totals are different, the scale tips and the sentence is false.'],
    },
    play: {
      title: 'Balance the Scale',
      assessed: true,
      weight: 1,
      game: {
        type: 'balance',
        unknownLabel: '?',
        rounds: [
          { id: 'six-three', left: [6, 3], right: ['unknown'], answer: 9, choices: [8, 9, 10], prompt: '6 + 3 = ?', hint: 'Add the left side: 6 + 3.', explanation: '6 + 3 = 9, so 9 balances the scale.' },
          { id: 'four-five', left: [4, 5], right: [3, 'unknown'], answer: 6, choices: [5, 6, 7, 9], prompt: '4 + 5 = 3 + ?', hint: 'The left side is 9. What do you add to 3 to make 9?', explanation: '4 + 5 = 9 and 3 + 6 = 9. Both sides are 9.' },
          { id: 'two-x', left: [2, 'unknown'], right: [5, 4], answer: 7, choices: [7, 9, 11], prompt: '2 + ? = 5 + 4', hint: 'The right side is 9. Two plus what makes 9?', explanation: '2 + 7 = 9 and 5 + 4 = 9.' },
          { id: 'eight-x', left: [8, 'unknown'], right: [6, 6], answer: 4, choices: [2, 4, 6, 12], prompt: '8 + ? = 6 + 6', hint: 'The right side is 12. Count on from 8 to 12.', explanation: '8 + 4 = 12 and 6 + 6 = 12.' },
        ],
      },
      coach: BALANCE_COACH,
    },
    practice: {
      weight: 3,
      questions: [
        {
          id: 'q-both-sides',
          type: 'true-false',
          prompt: '5 + 3 = 4 + 4',
          correct: true,
          hint: 'Work out each side first.',
          explanation: 'True! 5 + 3 = 8 and 4 + 4 = 8.',
        },
        {
          id: 'q-trap',
          type: 'single-choice',
          prompt: 'What number makes 4 + 5 = 3 + __ true?',
          options: [
            { id: '6', text: '6' },
            { id: '9', text: '9' },
            { id: '12', text: '12' },
          ],
          correctOptionId: '6',
          hint: 'The left side is 9. What do you add to 3 to make 9?',
          explanation: '3 + 6 = 9, the same as 4 + 5. 9 is a trap: 3 + 9 would be 12!',
        },
        {
          id: 'q-meaning',
          type: 'single-choice',
          prompt: 'What does = mean?',
          options: [
            { id: 'next', text: 'The answer comes next' },
            { id: 'same', text: 'Both sides have the same value' },
            { id: 'add', text: 'Add the numbers' },
          ],
          correctOptionId: 'same',
          hint: 'Think about the balance scale.',
          explanation: '= means both sides have the same value, like a level scale.',
        },
      ],
    },
    mentor: {
      facts: [
        'The equals sign = means both sides have the same value.',
        'There can be sums on both sides of =, for example 4 + 5 = 3 + 6.',
        'A common mistake is to think = means "write the answer next". In 4 + 5 = 3 + ?, the missing number is 6, not 9.',
      ],
      simpler: 'Think of = like a see-saw that is perfectly level. Both sides must weigh the same.',
      examples: ['You have 3 red beads and 4 blue beads. Your friend has 5 red and 2 blue. You both have 7 beads, so 3 + 4 = 5 + 2!'],
      why: 'The scale tips down on the side with the bigger total. It is level only when both totals are the same.',
      hints: {
        watch: 'Add up each side of the scale and compare the totals.',
        play: 'Work out the side with no question mark first. Then find what makes the other side the same.',
        practice: 'Work out each side of = separately.',
        default: 'Work out each side of = and compare.',
      },
      faq: [
        { keywords: ['equals', 'equal sign', '='], answer: 'The equals sign means "is the same as". Both sides of = have the same value.' },
        { keywords: ['tip', 'tilt', 'heavier'], answer: 'The scale tips down on the side with the bigger total, like a see-saw goes down where the heavier child sits.' },
      ],
      practice: [
        { question: 'Is 6 + 2 = 4 + 4 true or false?', accept: ['true', 'yes'], explanation: 'True! Both sides are 8.' },
        { question: 'What number makes 5 + 5 = 7 + ? true?', accept: ['3', 'three'], explanation: '5 + 5 = 10 and 7 + 3 = 10.' },
      ],
    },
  },
  {
    id: 'missing-number-find',
    subjectId: 'mathematics',
    lessonId: 'missing-numbers',
    order: 2,
    title: 'Finding the missing number',
    summary: 'Use the balance idea and subtraction to find missing numbers.',
    objectives: ['Find a missing number in an addition sentence.', 'Use subtraction to find and check a missing number.'],
    language: 'en',
    icon: 'hash',
    estimatedMinutes: 7,
    watch: {
      video: missingVideo('video-missing-number-find', 'Finding the missing number'),
      intro: 'A number is hiding behind a question mark. Let us use the balance to find it!',
      explainer: [
        scene('In ? + 6 = 15, some number plus 6 must balance 15. We need to find that number.', { kind: 'balance', left: '? + 6', right: '15', tilt: 1 }),
        scene('Count on from 6 to 15: that is 9 jumps. Or take 6 away from 15: 15 - 6 = 9.', { kind: 'number-line', from: 6, to: 15, start: 6, jumps: 9 }),
        scene('Check it: 9 + 6 = 15. The scale is level, so 9 is right!', { kind: 'balance', left: '9 + 6', right: '15', tilt: 0 }),
      ],
      keyIdeas: ['The missing number makes both sides balance.', 'In ? + 6 = 15, work out 15 - 6 to find it.', 'Check by putting your number back in.'],
    },
    play: {
      title: 'Mystery Number Balance',
      assessed: true,
      weight: 1,
      game: {
        type: 'balance',
        unknownLabel: '?',
        rounds: [
          { id: 'plus-six', left: ['unknown', 6], right: [15], answer: 9, choices: [7, 8, 9, 21], prompt: '? + 6 = 15', hint: 'Work out 15 - 6.', explanation: '9 + 6 = 15.' },
          { id: 'fourteen', left: [14], right: [8, 'unknown'], answer: 6, choices: [5, 6, 7, 22], prompt: '14 = 8 + ?', hint: 'What do you add to 8 to make 14? Try 14 - 8.', explanation: '8 + 6 = 14.' },
          { id: 'doubles', left: [7, 'unknown'], right: [9, 9], answer: 11, choices: [9, 10, 11, 18], prompt: '7 + ? = 9 + 9', hint: 'First add the right side: 9 + 9 = 18.', explanation: '9 + 9 = 18 and 7 + 11 = 18.' },
          { id: 'twice', left: ['unknown', 'unknown'], right: [16], answer: 8, choices: [6, 8, 10, 16], prompt: '? + ? = 16 (both are the same number)', hint: 'Which number added to itself makes 16?', explanation: '8 + 8 = 16.' },
        ],
      },
      coach: BALANCE_COACH,
    },
    practice: {
      weight: 3,
      questions: [
        {
          id: 'q-plus-seven',
          type: 'single-choice',
          prompt: '? + 7 = 12. What is the missing number?',
          options: [
            { id: '4', text: '4' },
            { id: '5', text: '5' },
            { id: '19', text: '19' },
          ],
          correctOptionId: '5',
          hint: 'Work out 12 - 7.',
          explanation: '12 - 7 = 5, and 5 + 7 = 12.',
        },
        {
          id: 'q-twenty',
          type: 'single-choice',
          prompt: '20 = 13 + ?',
          options: [
            { id: '6', text: '6' },
            { id: '7', text: '7' },
            { id: '33', text: '33' },
          ],
          correctOptionId: '7',
          hint: 'What do you add to 13 to make 20?',
          explanation: '13 + 7 = 20.',
        },
        {
          id: 'q-check',
          type: 'true-false',
          prompt: 'In ? + 9 = 17, the missing number is 26.',
          correct: false,
          hint: 'Put 26 back in. Is 26 + 9 equal to 17?',
          explanation: 'False. 26 + 9 = 35, not 17. The missing number is 17 - 9 = 8.',
        },
      ],
    },
    mentor: {
      facts: [
        'A missing number is the number that makes both sides of = have the same value.',
        'Subtraction undoes addition: if ? + 6 = 15, then ? = 15 - 6 = 9.',
        'Check an answer by putting it back into the number sentence.',
      ],
      simpler: 'Ask yourself: what number do I need to add to make both sides the same?',
      examples: ['You need 15 stickers for a page and have 6. How many more? 15 - 6 = 9 more stickers.'],
      why: 'Adding and taking away are opposites. Taking 6 away from 15 tells you what was there before the 6 was added.',
      hints: {
        watch: 'See how taking away helps to find the hidden number.',
        play: 'Work out the side without the question mark, then take away the number you can see.',
        practice: 'Take away the number you know from the total.',
        default: 'Take away the number you know from the total, then check.',
      },
      faq: [
        { keywords: ['missing number', 'question mark'], answer: 'The question mark hides one number. Find the number that makes both sides of = the same.' },
        { keywords: ['check', 'checking'], answer: 'Put your number in place of the question mark and add. If both sides match, you are right!' },
      ],
      practice: [
        { question: 'What is the missing number? ? + 4 = 11', accept: ['7', 'seven'], explanation: '11 - 4 = 7, and 7 + 4 = 11.' },
        { question: 'What is the missing number? 10 = 3 + ?', accept: ['7', 'seven'], explanation: '3 + 7 = 10.' },
      ],
    },
  },

  /* --------------------------------------- Level 3 · Letters for Numbers */
  {
    id: 'algebra-letters',
    subjectId: 'mathematics',
    lessonId: 'letters-for-numbers',
    order: 1,
    title: 'Using a letter for a number',
    summary: 'Use a letter like x to stand for an unknown number.',
    objectives: ['Explain that a letter can stand for an unknown number.', 'Find the value of a letter that makes an equation true.'],
    language: 'en',
    icon: 'variable',
    estimatedMinutes: 7,
    watch: {
      video: missingVideo('video-algebra-letters', 'Using a letter for a number'),
      intro: 'Remember the question-mark puzzles? In algebra we use a letter instead of a question mark.',
      explainer: [
        scene('In algebra, a letter like x stands for a number we do not know yet. x + 4 = 10 means "some number plus 4 equals 10".', { kind: 'balance', left: 'x + 4', right: '10', tilt: 1 }),
        scene('An equation is like a balanced scale. When x is 6, both sides are 10, so x = 6.', { kind: 'balance', left: '6 + 4', right: '10', tilt: 0 }),
        scene('A letter can stand for different numbers in different equations. In x + 2 = 5, x is 3.', { kind: 'balance', left: '3 + 2', right: '5', tilt: 0 }),
      ],
      keyIdeas: ['A letter such as x stands for an unknown number.', 'An equation says both sides have the same value.', 'Solving means finding the number that makes the equation true.'],
    },
    play: {
      title: 'Find x',
      assessed: true,
      weight: 1,
      game: {
        type: 'balance',
        unknownLabel: 'x',
        rounds: [
          { id: 'x-plus-four', left: ['unknown', 4], right: [10], answer: 6, choices: [4, 6, 14], prompt: 'x + 4 = 10', hint: 'What number plus 4 makes 10?', explanation: 'x = 6 because 6 + 4 = 10.' },
          { id: 'x-plus-seven', left: ['unknown', 7], right: [15], answer: 8, choices: [7, 8, 22], prompt: 'x + 7 = 15', hint: 'Work out 15 - 7.', explanation: 'x = 8 because 8 + 7 = 15.' },
          { id: 'twelve', left: [12], right: ['unknown', 5], answer: 7, choices: [5, 7, 17], prompt: '12 = x + 5', hint: 'An equation can be written either way round. What plus 5 makes 12?', explanation: 'x = 7 because 7 + 5 = 12.' },
          { id: 'x-plus-x', left: ['unknown', 'unknown'], right: [14], answer: 7, choices: [7, 12, 14], prompt: 'x + x = 14', hint: 'Both x are the same number. Which number doubled is 14?', explanation: 'x = 7 because 7 + 7 = 14.' },
        ],
      },
      coach: BALANCE_COACH,
    },
    practice: {
      weight: 3,
      questions: [
        {
          id: 'q-x-plus-three',
          type: 'single-choice',
          prompt: 'If x + 3 = 9, what is x?',
          options: [
            { id: '3', text: '3' },
            { id: '6', text: '6' },
            { id: '12', text: '12' },
          ],
          correctOptionId: '6',
          hint: 'Work out 9 - 3.',
          explanation: 'x = 6 because 6 + 3 = 9.',
        },
        {
          id: 'q-substitute',
          type: 'true-false',
          prompt: 'In x + 5 = 11, x stands for the number 6.',
          correct: true,
          hint: 'Put 6 in place of x and add.',
          explanation: 'True! 6 + 5 = 11.',
        },
        {
          id: 'q-meaning-x',
          type: 'single-choice',
          prompt: 'What does the letter x mean in x + 2 = 10?',
          options: [
            { id: 'multiply', text: 'It means multiply' },
            { id: 'unknown', text: 'It stands for an unknown number' },
            { id: 'ten', text: 'It is the answer, 10' },
          ],
          correctOptionId: 'unknown',
          hint: 'Think about the question-mark puzzles.',
          explanation: 'x stands for a number we need to find. Here x = 8, because 8 + 2 = 10.',
        },
      ],
    },
    mentor: {
      facts: [
        'In algebra, a letter such as x stands for an unknown number.',
        'An equation such as x + 4 = 10 says both sides have the same value.',
        'Solving an equation means finding the value of the letter that makes it true. Check by putting the value back in.',
        'In x + x = 14, both x stand for the same number, so x = 7.',
      ],
      simpler: 'x is just a hidden number, like the question mark in a puzzle. Find the number that makes both sides equal.',
      examples: ['A bag has some marbles. Add 4 more and you have 10. If x is the marbles in the bag, x + 4 = 10, so x = 6.'],
      why: 'The equation is like a level scale: both sides must have the same value. Only one number for x keeps it level.',
      hints: {
        watch: 'Look at how the letter replaces the question mark.',
        play: 'Work out the side without x first, then find what x must be.',
        practice: 'Take away the number you know from the other side.',
        default: 'Find the number for x that makes both sides equal.',
      },
      faq: [
        { keywords: ['algebra'], answer: 'Algebra is maths where letters stand for numbers we do not know yet, so we can write and solve puzzles about them.' },
        { keywords: ['why x', 'letter', 'variable'], answer: 'Any letter can be used. x is popular, but you could use n or a. The letter just holds the place of an unknown number.' },
        { keywords: ['equation'], answer: 'An equation is a number sentence with an equals sign. Both sides have the same value.' },
      ],
      practice: [
        { question: 'If x + 5 = 9, what is x?', accept: ['4', 'four'], explanation: 'x = 4 because 4 + 5 = 9.' },
        { question: 'If x + x = 10, what is x?', accept: ['5', 'five'], explanation: 'x = 5 because 5 + 5 = 10.' },
      ],
    },
  },
  {
    id: 'algebra-one-step',
    subjectId: 'mathematics',
    lessonId: 'letters-for-numbers',
    order: 2,
    title: 'Solving one-step equations',
    summary: 'Keep the balance: do the same to both sides.',
    objectives: ['Solve equations like x + 5 = 12 by subtracting from both sides.', 'Check a solution by putting it back into the equation.'],
    language: 'en',
    icon: 'scale',
    estimatedMinutes: 8,
    watch: {
      video: missingVideo('video-algebra-one-step', 'Solving one-step equations'),
      intro: 'Mathematicians have a trick for finding x: keep the scale balanced!',
      explainer: [
        scene('To solve x + 5 = 12, we want x on its own on one side.', { kind: 'balance', left: 'x + 5', right: '12', tilt: 0 }),
        scene('Take 5 away from BOTH sides and the scale stays balanced: x = 12 - 5.', { kind: 'balance', left: 'x', right: '12 - 5', tilt: 0 }),
        scene('So x = 7. Check: 7 + 5 = 12. It works!', { kind: 'balance', left: '7 + 5', right: '12', tilt: 0 }),
      ],
      keyIdeas: ['Whatever you do to one side, do to the other side too.', 'Subtract to undo adding: x + 5 = 12 gives x = 12 - 5 = 7.', 'Check your answer by putting it back into the equation.'],
    },
    play: {
      title: 'Equation Balancer',
      assessed: true,
      weight: 1,
      game: {
        type: 'balance',
        unknownLabel: 'x',
        rounds: [
          { id: 'x-plus-five', left: ['unknown', 5], right: [12], answer: 7, choices: [5, 7, 17], prompt: 'x + 5 = 12', hint: 'Subtract 5 from both sides: x = 12 - 5.', explanation: 'x = 7. Check: 7 + 5 = 12.' },
          { id: 'x-plus-nine', left: ['unknown', 9], right: [20], answer: 11, choices: [9, 11, 29], prompt: 'x + 9 = 20', hint: 'x = 20 - 9.', explanation: 'x = 11. Check: 11 + 9 = 20.' },
          { id: 'twenty-five', left: [25], right: ['unknown', 10], answer: 15, choices: [10, 15, 35], prompt: '25 = x + 10', hint: 'Subtract 10 from both sides.', explanation: 'x = 15. Check: 15 + 10 = 25.' },
          { id: 'two-numbers', left: ['unknown', 4, 6], right: [18], answer: 8, choices: [6, 8, 10, 28], prompt: 'x + 4 + 6 = 18', hint: 'First add 4 + 6 = 10. Then x + 10 = 18.', explanation: 'x = 8. Check: 8 + 4 + 6 = 18.' },
        ],
      },
      coach: BALANCE_COACH,
    },
    practice: {
      weight: 3,
      questions: [
        {
          id: 'q-solve',
          type: 'single-choice',
          prompt: 'Solve x + 8 = 15.',
          options: [
            { id: '7', text: 'x = 7' },
            { id: '8', text: 'x = 8' },
            { id: '23', text: 'x = 23' },
          ],
          correctOptionId: '7',
          hint: 'Subtract 8 from both sides.',
          explanation: 'x = 15 - 8 = 7. Check: 7 + 8 = 15.',
        },
        {
          id: 'q-step',
          type: 'single-choice',
          prompt: 'To solve x + 6 = 14, what should you do to both sides?',
          options: [
            { id: 'add', text: 'Add 6' },
            { id: 'subtract-6', text: 'Subtract 6' },
            { id: 'subtract-14', text: 'Subtract 14' },
          ],
          correctOptionId: 'subtract-6',
          hint: 'What undoes adding 6?',
          explanation: 'Subtracting 6 from both sides leaves x on its own: x = 14 - 6 = 8.',
        },
        {
          id: 'q-verify',
          type: 'true-false',
          prompt: 'x = 9 is the solution of x + 11 = 20.',
          correct: true,
          hint: 'Check: what is 9 + 11?',
          explanation: 'True! 9 + 11 = 20.',
        },
      ],
    },
    mentor: {
      facts: [
        'To keep an equation balanced, do the same thing to both sides.',
        'Subtracting undoes adding: from x + 5 = 12, subtract 5 from both sides to get x = 7.',
        'Always check a solution by putting it back into the original equation.',
      ],
      simpler: 'Picture the scale. Take the same amount off both sides and it stays level, until only x is left on its own.',
      examples: ['A box plus 5 kg weighs 12 kg. Take 5 kg off both sides of the scale: the box weighs 7 kg.'],
      why: 'If both sides start equal and you take away the same amount from each, they are still equal. That is why the scale stays balanced.',
      hints: {
        watch: 'Watch what happens when the same amount is taken from both sides.',
        play: 'Take the number that is added to x away from the other side.',
        practice: 'Undo the adding by subtracting the same number from both sides.',
        default: 'Do the same to both sides to get x on its own.',
      },
      faq: [
        { keywords: ['both sides'], answer: 'Doing the same thing to both sides keeps an equation balanced, just like taking the same weight off both pans of a scale.' },
        { keywords: ['solve', 'solution'], answer: 'Solving means finding the value of x that makes the equation true. The solution is that value.' },
        { keywords: ['check'], answer: 'To check, replace x with your answer and work out both sides. If they match, your answer is right.' },
      ],
      practice: [
        { question: 'Solve x + 6 = 13. What is x?', accept: ['7', 'seven'], explanation: 'x = 13 - 6 = 7. Check: 7 + 6 = 13.' },
        { question: 'Solve 30 = x + 12. What is x?', accept: ['18', 'eighteen'], explanation: 'x = 30 - 12 = 18. Check: 18 + 12 = 30.' },
      ],
    },
  },
];
