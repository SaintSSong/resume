import express from 'express';  // 라우터를 생성하기 위해서 작성, express 라이브러리를 가져오는 것!
import { prisma } from '../utils/prisma.util.js';
import bcrypt from 'bcrypt'; // 비밀번호 hash를 값 때문에 작성


const router = express.Router(); // 라우터 생성!

router.post('/auth/sign-up', async (req, res, next) => {
    //     1.  **이메일, 비밀번호, 비밀번호 확인, 이름**을 **Request Body**(**`req.body`**)로 전달 받습니다.
    const { email, password, passwordCheck, name } = req.body;
    //     2. **유효성 검증 및 에러 처리**

    //     - **회원 정보 중 하나라도 빠진 경우** - “OOO을 입력해 주세요.”
    if (!email) {
        return res.status(400).json({ message: 'email을 입력해 주세요.' });
    }
    if (!password) {
        return res.status(400).json({ message: 'password를 입력해 주세요.' });
    }
    if (!passwordCheck) {
        return res.status(400).json({ message: 'passwordCheck를 입력해 주세요.' });
    }
    if (!name) {
        return res.status(400).json({ message: 'name를 입력해 주세요.' });
    }

    //     - **이메일 형식에 맞지 않는 경우** - “이메일 형식이 올바르지 않습니다.”
    const emailRegex = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,4}$/i;     /** 정규 표현식**/
    if (!emailRegex.test(email)) {
        return res.status(400).json({ message: '이메일 형식이 올바르지 않습니다.' });
    }

    //     - **이메일이 중복되는 경우** - “이미 가입 된 사용자입니다.”
    const isExistUser = await prisma.users.findFirst({
        // prisma.users를 쓰는 이유 지금 가지고 있는 프리즈마의 데이터에서 공통된 이메일이 존재하는지 확인해야하니까 사용자(user)의 데이터를 조회하는 거지
        where: { email: email },    // ** where는 왜 쓰는가? 무슨 뜻이지?? 행열이라고 생각하니까 답이 나온다. 즉 스키마프리즈마 run 시키면 나오는 행열에 email이란 열에서 찾기 때문에 where! 어디 열에서 찾을 거냐 이런 뜻이 된다.
    });
    if (isExistUser) {
        return res.status(409).json({ message: '이미 가입 된 사용자입니다.' });
    }

    //     - **비밀번호가 6자리 미만인 경우** - “비밀번호는 6자리 이상이어야 합니다.”
    if (password.length < 6) {
        return res.status(400).json({message: '비밀번호는 6자리 이상이어야 합니다.' });
    }

    //     - **비밀번호와 비밀번호 확인이 일치하지 않는 경우** - “입력 한 두 비밀번호가 일치하지 않습니다.”
    if(password !== passwordCheck) {
        return res.status(401).json({errorMessage: '입력한 두 비밀번호가 일치하지 않습니다.' });
    }

    //     3. **비즈니스 로직(데이터 처리)**
    //     - **사용자 ID, 역할, 생성일시, 수정일시**는 ****자동 생성됩니다.

    //     - 보안을 위해 **비밀번호**는 평문(Plain Text)으로 저장하지 않고 **Hash 된 값**을 저장합니다.
    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.users.create({
        data: {
            email: email,
            password: hashedPassword,
        }
    });

    //     - **역할**의 종류는 다음과 같으며, 기본 값은 **`APPLICANT`** 입니다.
    //         - 지원자 **`APPLICANT`**
    //         - 채용 담당자 **`RECRUITER`**

    const userInfo = await prisma.userInfos.create({  // 이 속에 Role이 자동적으로 들어가져 있는 것! 왜 ? default값이니까
        data: {
            name: name,
            UserId: user.userId,
        }
    });

    //     4. **반환 정보**
    //     - **사용자 ID, 이메일, 이름, 역할, 생성일시, 수정일시**를 반환합니다.

    return res.status(201).json({ 
        message: '회원가입이 완료되었습니다.',
        data: {
            userId: user.userId,
            email: user.email,
            name: userInfo.name,
            role: userInfo.role,
            createdAt: user.createdAt,
            updatedAt: user.updatedAt, 
        }
    });
});





export default router;