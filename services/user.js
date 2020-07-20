class User {

  static async getUser(userId = 0) {
    const [[user]] = await global.db.query(
      `SELECT * FROM user WHERE id = :userId`, {
        userId
      }
    );
    return user;
  }

  static async getUsers() {
    const [users] = await global.db.query(`SELECT *
                                           FROM user`);
    return users;
  }

  static async getRoles() {
    const [roles] = await global.db.query(
      'Select * From userRole order by id asc;'
    );
    return roles;
  }

  static async updatePassword(userId, passwordHash, passwordSalt, passwordIterations) {
    const resultPass = await global.db.query(
      'update user set passwordHash = :passwordHash, passwordSalt = :passwordSalt, passwordIterations = :passwordIterations where id = :id', {
        id: userId,
        passwordHash: passwordHash,
        passwordSalt: passwordSalt,
        passwordIterations: passwordIterations,
      }
    );
    return resultPass;
  }

  static async updateUser(userId, email, fname, lname, phone, status) {
    const result = await global.db.query(`update user
                                            set email  = :email,
                                                fname  = :fname,
                                                lname  = :lname,
                                                phone  = :phone,
                                                status = :status
                                            where id = :id`, {
      id: userId,
      email: email,
      fname: fname,
      lname: lname,
      phone: phone,
      status: status,
    });
    return result;
  }

  static async deleteUser(userId) {
    const result = await global.db.query('update user set status = 0 where id = :id', {
      id: userId,
    });
    return result;
  }
}

module.exports = User;
