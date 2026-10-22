import type { BarChartConfig } from '../../domain/types';

/** Test data for Bar Chart Builder: a scale of 0..10 in twos, build and read rounds, up to 6 bars. */
export const barChartTestConfig: BarChartConfig = {
  type: 'bar-chart',
  max: 10,
  step: 2,
  rounds: [
    {
      id: 'fruit-build',
      mode: 'build',
      categories: [
        { id: 'mango', label: 'Mango' },
        { id: 'apple', label: 'Apple', icon: 'apple' },
        { id: 'banana', label: 'Banana' },
      ],
      values: [6, 4, 2],
      prompt: 'Make the chart match the fruit table.',
      hint: 'Each line on the scale is 2. Count up in twos.',
      explanation: 'Every bar now reaches its number from the table.',
    },
    {
      id: 'weather-read',
      mode: 'read',
      categories: [
        { id: 'rain', label: 'Rain', icon: 'cloud' },
        { id: 'sun', label: 'Sun', icon: 'sun' },
        { id: 'wind', label: 'Wind', icon: 'wind' },
      ],
      values: [8, 4, 2],
      answerId: 'rain',
      prompt: 'Which weather did we see most often?',
      hint: 'The most often is the tallest bar.',
      explanation: 'Rain has the tallest bar: 8 days.',
    },
    {
      id: 'pets-build',
      mode: 'build',
      categories: [
        { id: 'cats', label: 'Cats' },
        { id: 'dogs', label: 'Dogs' },
        { id: 'fish', label: 'Fish', icon: 'fish' },
        { id: 'birds', label: 'Birds', icon: 'bird' },
        { id: 'mice', label: 'Mice' },
        { id: 'frogs', label: 'Frogs' },
      ],
      values: [2, 4, 0, 6, 2, 10],
      prompt: 'Draw the pets chart.',
      hint: 'Fish is 0, so its bar stays on the line.',
      explanation: 'Six bars, six numbers, all matching.',
    },
    {
      id: 'visitors-read',
      mode: 'read',
      categories: [
        { id: 'mon', label: 'Monday' },
        { id: 'tue', label: 'Tuesday' },
        { id: 'wed', label: 'Wednesday' },
        { id: 'thu', label: 'Thursday' },
      ],
      values: [4, 6, 10, 2],
      answerId: 'tue',
      prompt: 'Which day had 6 visitors?',
      hint: 'Find the line for 6, then the bar that stops on it.',
      explanation: 'Tuesday’s bar stops on the line for 6.',
    },
  ],
};
