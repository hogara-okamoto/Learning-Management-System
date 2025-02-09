This is an app that summarizes the content of videos. Enter the video URL and press Generate Summary.

- backend
server.js
transcribe.py

- fronend
page.tsx

To run this code, you need to install node modules and add an .env file in a lms-backend file.

- setup for backend
mkdir lms-backend
cd lms-backend
npm init -y
npm install express openai mongoose cors

- setup for frontend
npx create-next-app@latest lms-frontend
cd lms-frontend
npm install
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p

- .env
OPENAI_API_KEY="xxxxxxxxxxxx"<br>
PORT=5000

To run.

- backend
node server.js

-frontend
npm run dev

Improvement
