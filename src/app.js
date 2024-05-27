import express from 'express';
import AuthRouter from './routers/auth.router.js';
import cookieParser from 'cookie-parser';
import ResumesRouter from './routers/resumes.router.js';
import UserRouer from './routers/users.router.js';



const app = express();
const PORT = 3030;

app.use(express.json());
app.use(cookieParser());
app.use('/', [AuthRouter, ResumesRouter, UserRouer]);

app.listen(PORT, () => {
  console.log(PORT, '포트로 서버가 열렸습니다.');
});
