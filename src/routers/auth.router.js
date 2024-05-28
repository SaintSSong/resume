import express from 'express'; // 라우터를 생성하기 위해서 작성, express 라이브러리를 가져오는 것!
import { prisma } from '../utils/prisma.util.js';
import bcrypt from 'bcrypt'; // 비밀번호 hash를 값 때문에 작성
import jwt from 'jsonwebtoken';
import requireAccessTokenMiddleware from '../middlewares/require-access-token.middleware.js';

const router = express.Router(); // 라우터 생성!

// 비밀 키는 외부에 노출되면 안되겠죠? 그렇기 때문에, .env 파일을 이용해 비밀 키를 관리해야합니다.
const ACCESS_TOKEN_SECRET_KEY = `HangHae99`; // Access Token의 비밀 키를 정의합니다.
const REFRESH_TOKEN_SECRET_KEY = `Sparta`; // Refresh Token의 비밀 키를 정의합니다.

// 회원가입 API
router.post('/auth/sign-up', async (req, res, next) => {
    //     1.  **이메일, 비밀번호, 비밀번호 확인, 이름**을 **Request Body**(**`req.body`**)로 전달 받습니다.
    const { email, password, passwordCheck, name } = req.body;
    //     2. **유효성 검증 및 에러 처리**

    //     - **회원 정보 중 하나라도 빠진 경우** - “OOO을 입력해 주세요.”
    if (!email) {
        return res.status(400).json({ errorMessage: 'email을 입력해 주세요.' });
    }
    if (!password) {
        return res.status(400).json({ errorMessage: 'password를 입력해 주세요.' });
    }
    if (!passwordCheck) {
        return res
            .status(400)
            .json({ errorMessage: 'passwordCheck를 입력해 주세요.' });
    }
    if (!name) {
        return res.status(400).json({ errorMessage: 'name를 입력해 주세요.' });
    }

    //     - **이메일 형식에 맞지 않는 경우** - “이메일 형식이 올바르지 않습니다.”
    const emailRegex =
        /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,4}$/i; /** 정규 표현식**/
    if (!emailRegex.test(email)) {
        return res
            .status(400)
            .json({ errorMessage: '이메일 형식이 올바르지 않습니다.' });
    }

    //     - **이메일이 중복되는 경우** - “이미 가입 된 사용자입니다.”
    const isExistUser = await prisma.users.findFirst({
        // prisma.users를 쓰는 이유 지금 가지고 있는 프리즈마의 데이터에서 공통된 이메일이 존재하는지 확인해야하니까 사용자(user)의 데이터를 조회하는 거지
        where: { email: email }, // ** where는 왜 쓰는가? 무슨 뜻이지?? 행열이라고 생각하니까 답이 나온다. 즉 스키마프리즈마 run 시키면 나오는 행열에 email이란 열에서 찾기 때문에 where! 어디 열에서 찾을 거냐 이런 뜻이 된다.
    });
    if (isExistUser) {
        return res.status(409).json({ errorMessage: '이미 가입 된 사용자입니다.' });
    }

    //     - **비밀번호가 6자리 미만인 경우** - “비밀번호는 6자리 이상이어야 합니다.”
    if (password.length < 6) {
        return res
            .status(400)
            .json({ errorMessage: '비밀번호는 6자리 이상이어야 합니다.' });
    }

    //     - **비밀번호와 비밀번호 확인이 일치하지 않는 경우** - “입력 한 두 비밀번호가 일치하지 않습니다.”
    if (password !== passwordCheck) {
        return res
            .status(401)
            .json({ errorMessage: '입력한 두 비밀번호가 일치하지 않습니다.' });
    }

    //     3. **비즈니스 로직(데이터 처리)**
    //     - **사용자 ID, 역할, 생성일시, 수정일시**는 ****자동 생성됩니다.
    //     - **역할**의 종류는 다음과 같으며, 기본 값은 **`APPLICANT`** 입니다.
    //         - 지원자 **`APPLICANT`**
    //         - 채용 담당자 **`RECRUITER`**

    //     - 보안을 위해 **비밀번호**는 평문(Plain Text)으로 저장하지 않고 **Hash 된 값**을 저장합니다.
    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.users.create({
        data: {
            email: email,
            password: hashedPassword,
            name: name,
        },
    });


    //     4. **반환 정보**
    //     - **사용자 ID, 이메일, 이름, 역할, 생성일시, 수정일시**를 반환합니다.

    return res.status(201).json({
        message: '회원가입이 완료되었습니다.',
        data: {
            userId: user.userId,
            email: user.email,
            name: user.name,
            role: user.role,
            createdAt: user.createdAt,
            updatedAt: user.updatedAt,
        },
    });
});

const tokenStorages = {}; // 리프레시 토큰을 관리할 객체

/** 로그인 API 생성*/
router.post('/auth/sign-in', async (req, res, next) => {
    // 1. **요청 정보**
    //     - **이메일, 비밀번호**를 **Request Body**(**`req.body`**)로 전달 받습니다.
    const { email, password } = req.body;

    // 2. **유효성 검증 및 에러 처리**
    //     - **로그인 정보 중 하나라도 빠진 경우** - “OOO을 입력해 주세요.”
    if (!email) {
        return res.status(401).json({ errorMessage: '이메일을 입력해 주세요.' });
    }
    if (!password) {
        return res.status(401).json({ errorMessage: '비밀번호를 입력해 주세요.' });
    }

    //     - **이메일 형식에 맞지 않는 경우** - “이메일 형식이 올바르지 않습니다.”
    const emailRegex =
        /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,4}$/i; /** 정규 표현식**/
    if (!emailRegex.test(email)) {
        return res
            .status(400)
            .json({ errorMessage: '이메일 형식이 올바르지 않습니다.' });
    }

    //     - **이메일로 조회되지 않거나 비밀번호가 일치하지 않는 경우** - “인증 정보가 유효하지 않습니다.”
    const user = await prisma.users.findFirst({ where: { email: email } });
    if (!user) {
        return res.status(401).json({ message: '존재하지 않는 이메일 입니다.' });
    }

    if (password !== password) {
        return res
            .status(401)
            .json({ errorMessage: '비밀번호가 일치하지 않습니다.' });
    }

    // 3. **비즈니스 로직(데이터 처리)**
    //     - **AccessToken(Payload**에 **`사용자 ID`**를 포함하고, **유효기한**이 **`12시간`)**을 생성합니다.

    /** Access Token, Refresh Token 발급 API **/
    const accessToken = createAccessToken(user.userId); // 이게 토큰 생성이다 잊지마
    const refreshToken = createRefreshToken(user.userId);

    // Refresh Token을 가지고 해당 유저의 정보를 서버에 저장합니다.
    tokenStorages[refreshToken] = {
        id: user.userId, // 데이터베이스에서 가져온 사용자 정보 ID를 저장합니다.
        ip: req.ip, // 사용자의 IP 정보를 저장합니다.             <- 얘네는 자동으로 생성되는것인데 왜 적었냐? 이 정보를 가시적으로 보이게 만들 것이냐 아니냐의 차이다.
        userAgent: req.headers['user-agent'], // 사용자의 User Agent 정보를 저장합니다.  <-얘 또한 마찬가지다.
    };

    // 4. **반환 정보**
    //     - **AccessToken**을 반환합니다.
    // res.cookie('refreshToken', `Bearer ${refreshToken}`); // Refresh Token을 Cookie에 전달(반환)한다.
    // res.cookie('accessToken', `Bearer ${accessToken}`); // Access Token을 Cookie에 전달(반환)한다.

    return res
        .status(200)
        .json({
            message: 'Token이 정상적으로 발급되었습니다.',
            accessToken: `Bearer ${accessToken}`,
            refreshToken: `Bearer ${refreshToken}`
        });
});

// Access Token을 생성하는 함수
function createAccessToken(id) {
    const accessToken = jwt.sign(
        { id: id }, // JWT 데이터
        ACCESS_TOKEN_SECRET_KEY, // Access Token의 비밀 키
        { expiresIn: '12h' }, // Access Token이 12시간 뒤에 만료되도록 설정합니다.
    );

    return accessToken;
}

// Refresh Token을 생성하는 함수
function createRefreshToken(id) {
    const refreshToken = jwt.sign(
        // payload에 들어갈 값인데 기본적으로 들어가는 것들에서 옵션 3개를 추가한 것이다.
        { id: id }, // JWT 데이터
        REFRESH_TOKEN_SECRET_KEY, // Refresh Token의 비밀 키
        { expiresIn: '7d' }, // Refresh Token이 7일 뒤에 만료되도록 설정합니다.
    );

    return refreshToken;
}



export default router;
