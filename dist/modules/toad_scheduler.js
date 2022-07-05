"use strict";
const { ToadScheduler, SimpleIntervalJob, AsyncTask } = require('toad-scheduler');
const moment = require('moment');
const { Op } = require('sequelize');
const db = require('../../models');
const scheduler = new ToadScheduler();
const task = new AsyncTask('Delete Unused Images', async () => {
    const images = await db.Image.findAll({
        where: {
            postId: null,
            updatedAt: { [Op.lt]: moment().subtract(1, 'days').toDate() },
        },
    });
    // eslint-disable-next-line
    for await (const image of images) {
        await deleteImg(image.imageUrl);
        await image.destroy();
    }
}, (err) => {
    console.log(err);
});
const job = new SimpleIntervalJob({ hours: 2 }, task);
module.exports = scheduler.addSimpleIntervalJob(job);
