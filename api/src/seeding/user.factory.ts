import { E_UserType } from '@entities/user/models/types';
import { User } from '@entities/user/models/user.entity';
import * as bcrypt from 'bcrypt';
import { setSeederFactory } from 'typeorm-extension';
import { getFaker } from '../utils/helpers';

export const UserFactory = setSeederFactory(User, async () => {
  const user = new User();

  const customFaker = getFaker();
  user.name = `${customFaker.person.firstName()} ${customFaker.person.lastName()}`;
  user.email = customFaker.internet.email();
  user.phone = customFaker.phone.number({ style: 'international' });
  user.password = await bcrypt.hash(customFaker.internet.password(), 10);
  // user.password = await bcrypt.hash(faker.internet.password(), 10);
  user.role = E_UserType.Buyer;
  return user;
});
