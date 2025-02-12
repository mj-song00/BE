const bookingService = require('../services/booking.service');
const dayjs = require('dayjs');
const timezone = require('dayjs/plugin/timezone');
const utc = require('dayjs/plugin/utc');

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.tz.setDefault('Asia/Seoul');

//나뭇잎 설정
const patchPoint = async (req, res, next) => {
  const userId = req.params.userId;
  const { setPoint } = req.body;

  await bookingService.patchPoint(setPoint, userId);
  return res.status(200).json({ result: true });
};
exports.patchPoint = patchPoint;

//예약 신청
const createBooking = async (req, res, next) => {
  const userId = res.locals.user.userId;
  const { blogId, start, end } = req.body;
  const hostId = req.params.blogId;
  const Leaf = await bookingService.findLeaf(hostId);
  const leaf = Leaf[0].dataValues.setPoint;
  const endTime = end;
  const startTime = dayjs(start).tz().format('YYYY-MM-DD HH:mm:ss');
  const now = dayjs().tz().format('YYYY-MM-DD HH:mm:ss');

  //  예약 신청 횟수 제한
  const bookingList = await bookingService.findList(blogId);
  if (bookingList.length > 11) {
    return res
      .status(400)
      .json({ result: false, msg: '예약 가능 횟수를 초과하였습니다.' });
  }
  // 예약 받는 횟수 제한
  const hostBbookingList = await bookingService.hostFindList(hostId);
  if (hostBbookingList.length > 11) {
    return res
      .status(400)
      .json({ result: false, msg: '예약 받을 수 있는 횟수를 초과하였습니다.' });
  }

  // 호스트id, 예약시간, 예약날짜 조회,
  const existRev = await bookingService.findRev(hostId, start, end);
  if (existRev.length > 0) {
    return res.status(400).json({ result: false, msg: '이미 예약된 시간 입니다.' });
  }
  // 유저 나뭇잎 조회
  const userPoint = res.locals.user.point;
  if (userPoint < leaf) {
    return res.status(400).json({ result: false, msg: ' 보유한 나뭇잎이 부족합니다.' });
  }

  if (blogId === undefined || start === undefined || end === undefined) {
    return res
      .status(400)
      .json({ result: false, msg: '시간, 날짜, 예약할 대상을 선택하세요.' });
  }

  //이전시간 예약 차단
  if (startTime < now) {
    return res
      .status(400)
      .json({ result: false, msg: '이미 지나간 시간대에는 예약할 수 없습니다.' });
  }

  //토큰 확인
  const token = req.rawHeaders[3].split(' ')[1];
  const base64Payload = token.split('.')[1];
  const payload = Buffer.from(base64Payload, 'base64');
  const result = JSON.parse(payload.toString());

  if (result.userId !== req.body.userId)
    res.status(400).json({
      msg: '유저가 다릅니다.',
    });

  //예약 신청
  const bookingResult = await bookingService.createBooking(
    blogId,
    leaf,
    start,
    end,
    hostId,
    userId,
    endTime
  );
  return res.status(200).json({ bookingResult, result: true });
};
exports.createBooking = createBooking;

// 예약 조회
const bookingList = async (req, res, next) => {
  const blogId = res.locals.user.blogId;
  const hostBookingList = await bookingService.hostBooking(blogId);
  const guestBookingList = await bookingService.guestBooking(blogId);

  const totalList = { hostBookingList, guestBookingList };
  return res.status(200).json({ totalList, result: true });
};
exports.bookingList = bookingList;

//유저 나뭇잎 보여주기
const leafList = async (req, res, next) => {
  const hostId = req.params.hostId;

  const gusetLeaf = res.locals.user.point;
  const hostLeaf = await bookingService.findHost(hostId);
  const pointList = { gusetLeaf, hostLeaf };

  return res.status(200).json({ pointList, result: true });
};
exports.leafList = leafList;

//  호스트 예약 수락
const acceptBooking = async (req, res, next) => {
  const hostId = req.params.hostId;
  const bookingId = req.params.bookingId;
  const guest = await bookingService.findOne(bookingId);
  const guestId = guest[0].guestId;
  const cntLeaf = await bookingService.findOne(bookingId);
  const leaf = cntLeaf[0].leaf;

  await bookingService.confirmBooking(hostId, bookingId, guestId, leaf);
  return res.status(200).json({ result: true });
};
exports.acceptBooking = acceptBooking;

// 호스트 예약 취소
const cancelReservation = async (req, res, next) => {
  const hostId = req.params.hostId;
  const bookingId = req.params.bookingId;
  const guest = await bookingService.findOne(bookingId);
  const guestId = guest[0].guestId;
  const cntLeaf = await bookingService.findOne(bookingId);
  const leaf = cntLeaf[0].leaf;

  await bookingService.recall(bookingId, guestId, hostId, leaf);
  res.status(200).json({ result: true });
};
exports.cancelReservation = cancelReservation;

// 게스트  예약 취소
const cancelBooking = async (req, res, next) => {
  const guestId = req.params.guestId;
  const bookingId = req.params.bookingId;
  const host = await bookingService.findOne(bookingId);
  const hostId = host[0].hostId;
  const cntLeaf = await bookingService.findOne(bookingId);
  const leaf = cntLeaf[0].leaf;

  await bookingService.recall(bookingId, guestId, hostId, leaf);
  res.status(200).json({ result: true });
};
exports.cancelBooking = cancelBooking;

//블로그 예약내역
const blogReservation = async (req, res, next) => {
  try {
    const { blogId } = req.params;
    const bookingList = await bookingService.hostBooking(blogId);
    return res.status(200).json({ bookingList });
  } catch (error) {
    console.log(error);
    next(error);
  }
};
exports.blogReservation = blogReservation;
