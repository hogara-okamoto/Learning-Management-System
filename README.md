This is an app that summarizes the content of videos. Enter the video URL and press Generate Summary.

- backend<br>
server.js<br>
transcribe.py<br>
.env

- fronend<br>
page.tsx

To run this code, you need to install node modules and add an .env file in a lms-backend file.

- setup for backend<br>
mkdir lms-backend<br>
cd lms-backend<br>
npm init -y<br>
npm install express openai mongoose cors

- setup for frontend<br>
npx create-next-app@latest lms-frontend<br>
cd lms-frontend<br>
npm install<br>
npm install -D tailwindcss postcss autoprefixer<br>
npx tailwindcss init -p<br>

- .env<br>
OPENAI_API_KEY="xxxxxxxxxxxx"<br>
PORT=5000

To run.

- backend<br>
node server.js

- frontend<br>
npm run dev<br>
localhost:3000

Improvement
I want to run this app in Vercel by putting the transcribe.py in an outside server.
