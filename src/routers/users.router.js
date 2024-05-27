import express from 'express'; // 라우터를 생성하기 위해서 작성, express 라이브러리를 가져오는 것!
import { prisma } from '../utils/prisma.util.js';
import requireAccessTokenMiddleware from '../middlewares/require-access-token.middleware.js';

const router = express.Router();

// 내 정보 조회 API (🔐 AccessToken 인증 필요)
router.get('/users', requireAccessTokenMiddleware, async (req, res, next) => {
    try {
        // 1. **요청 정보**
        //     - 사용자 정보는 **인증 Middleware(`req.user`)**를 통해서 전달 받습니다.
        const { userId } = req.user; // requireAccessTokenMiddleware 에서 작성했던 31번째 줄 에서 가져온 것

        // 2. **반환 정보**
        //     - **사용자 ID, 이메일, 이름, 역할, 생성일시, 수정일시**를 반환합니다.
        const user = await prisma.users.findFirst({
            where: { userId: userId },
            select: {
                userId: true,
                email: true,
                name: true,
                role: true,
                createdAt: true,
                updatedAt: true,
            },
        });
        return res.status(200).json({
            data : {
                userId: userId,
                email: user.email,
                name: user.name,
                role: user.role,
                createdAt: user.createdAt,
                updatedAt: user.updatedAt,
            }
        });
    } catch (error) {
        next(error);
    }
    
});

export default router;