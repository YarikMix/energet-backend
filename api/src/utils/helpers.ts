import { Faker, ru } from '@faker-js/faker';

export const isNumeric = (num) => {
  return !isNaN(num);
};

export const generateRandomFloat = (min, max) =>
  Math.random() * (max - min) + min;

export const generateRandomInt = (min, max) => {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min + 1)) + min;
};

export const getFaker = () =>
  new Faker({
    locale: [ru],
  });
