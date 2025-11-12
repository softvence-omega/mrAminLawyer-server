import { userRole } from '../constants';
import { UserModel } from '../modules/user/user.model';
import userServices from '../modules/user/user.service';

const adminSeeder = async () => {
  const admin = {
    name: 'Admin',
    phone: '+490123456789',
    password: '123456',
    confirmPassword: '123456',
    email: 'aminmuratkasim7@gmail.com',
    role: userRole.admin,
    agreedToTerms: true,
    OTPVerified: true,
  };

  const adminExist = await UserModel.findOne({ role: userRole.admin });

  console.log(adminExist);

  if (!adminExist) {
    console.log('seeding admin....', admin);
    const createAdmin = await userServices.createUser(admin);
    if (!createAdmin) {
      throw Error('admin could not be created');
    }

    console.log('✅ Created admin : ', createAdmin);
  } else {
    console.log(`✅ Admin already exists: ${admin.name}`);
  }
};

export default adminSeeder;
