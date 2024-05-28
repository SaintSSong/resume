import jwt from 'jsonwebtoken';
import { prisma } from '../utils/prisma.util.js';

// 1. 요청 정보
//     - AccessToken을 Request Header의 Authorization
//     값(`req.headers.authorization`)으로 전달 받으며, JWT 표준 인증 형태
//     (`Authorization: Bearer {{ AccessToken }}`)에 맞아야 합니다.

export default async (req, res, next) => {
  try {
    // const { accessToken } = req.cookies;
    const accessToken = req.headers['authorization'];

    //     2. 유효성 검증 및 에러 처리
    //     - Authorization 또는 AccessToken이 없는 경우 - “인증 정보가 없습니다.”
    if (!accessToken) {
      return res.status(401).json({ errorMessage: ' 인증 정보가 없습니다.' });
    }

    //     - JWT 표준 인증 형태와 일치하지 않는 경우 - “지원하지 않는 인증 방식입니다.”
    const [tokenType, token] = accessToken.split(' ');
    if (tokenType !== 'Bearer') {
      return res
        .status(401)
        .json({ errorMessage: '지원하지 않는 인증 방식입니다.' });
    }

    //     - AccessToken의 유효기한이 지난 경우 - “인증 정보가 만료되었습니다.” // 검증을 통과하면 payload를 뱉음.  <-- 중요!
    const decodedToken = jwt.verify(token, 'HangHae99');
    //     - 그 밖의 AccessToken 검증에 실패한 경우 - “인증 정보가 유효하지 않습니다.”

    // 3. 비즈니스 로직(데이터 처리)
    //     - Payload에 담긴 사용자 ID를 이용하여 사용자 정보를 조회합니다.
    //     - Payload에 담긴 사용자 ID와 일치하는 사용자가 없는 경우 - “인증 정보와 일치하는 사용자가 없습니다.”
    const user = await prisma.users.findFirst({
      where: {
        userId: decodedToken.id,
      },
    });
    if (!user) {
      return res
        .status(401)
        .json({ errorMessage: '인증 정보와 일치하는 사용자가 없습니다.' });
    }

    // 4. 반환 정보
    //     - 조회 된 사용자 정보를 `req.user`에 담고, 다음 동작을 진행합니다.
    req.user = user; // - 조회 된 사용자 정보를 `req.user`에 담고,
    next(); //  다음 동작을 진행합니다.

  } catch (error) {
    // 토큰이 만료되었거나, 조작되었을 때, 에러 메시지를 다르게 출력합니다.
    switch (error.name) {
      case 'TokenExpiredError':
        return res.status(401).json({ message: '인증 정보가 만료되었습니다.' });
      case 'JsonWebTokenError':
        return res
          .status(401)
          .json({ message: '인증 정보가 유효하지 않습니다.' });
      default:
        return res
          .status(401)
          .json({ message: error.message ?? '인증 정보가 유효하지 않습니다.' });
    }
  }
};

// async(req, rex, next) =>{   뼈대로 잡을 것
//     try{

//     } catch(error) {
//         next(error)
//     }
// };
