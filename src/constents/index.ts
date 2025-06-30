export type TUserRole = 'admin' | 'user';

export const userRole = {
  user: 'user',
  admin: 'admin',
} as const;

export type TErrorSource = {
  path: string | number;
  message: string;
}[];
