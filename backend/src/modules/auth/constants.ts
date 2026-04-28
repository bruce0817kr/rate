import { getJwtSecret } from '../../config/runtime.config';

export const jwtConstants = {
  secret: getJwtSecret(),
};
