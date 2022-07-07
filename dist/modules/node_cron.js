const cron = require('node-cron');
const sequelize = require('sequelize');
const { Op } = sequelize;
const dayjs = require('dayjs');

const User = require('../../models/user');

const task = cron.schedule(
  '* * * * * *',
  async () => {
    try {
      const user = await User.findAll({
        where: {
          deletedAt: {
            [Op.ne]: null,
          },
        },
      });

      for (let i = 0; i < user.length; i++) {
        const date = dayjs(user[i].deletedAt);
        if (date.add(3, 'M').format('YYYY-MM-DD HH:mm:ss')) {
          await User.destroy({ where: { userId: user[i].userId } });
        }
        return true;
      }
    } catch (error) {
      console.log(error);
    }
  },
  {
    scheduled: false,
  }
);

task.start();
