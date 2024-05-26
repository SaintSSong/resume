import express from 'express'; 
import AuthRouter from './routers/auth.router.js';
import cookieParser from 'cookie-parser';
import jwt from 'jsonwebtoken';

const app = express();
const PORT = 3030;

// 비밀 키는 외부에 노출되면 안되겠죠? 그렇기 때문에, .env 파일을 이용해 비밀 키를 관리해야합니다.
const ACCESS_TOKEN_SECRET_KEY = `HangHae99`; // Access Token의 비밀 키를 정의합니다.
const REFRESH_TOKEN_SECRET_KEY = `Sparta`; // Refresh Token의 비밀 키를 정의합니다.

app.use(express.json());
app.use(cookieParser());
app.use('/', [AuthRouter]);


const tokenStorages = {} // 리프레시 토큰을 관리할 객체

app.listen(PORT,()=>{
    console.log(PORT, "포트로 서버가 열렸습니다.")
});