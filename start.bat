@echo off
chcp 65001 >nul
title GEB Hub
REM === নিচের পাসওয়ার্ডটি নিজের পছন্দমতো বদলে নিন (= চিহ্নের পরে, কোনো ফাঁকা ছাড়া) ===
set ADMIN_PASSWORD=ChangeMe123
REM === ঐচ্ছিক ফ্রি AI: key থাকলে AI বাটন চালু হয়, খালি থাকলে বাটন লুকানো থাকে। key কাউকে দেখাবেন না ===
REM Gemini: aistudio.google.com থেকে ফ্রি key   |   Groq: console.groq.com থেকে ফ্রি key
set GEMINI_API_KEY=
set GROQ_API_KEY=
echo.
echo  GEB Hub চালু হচ্ছে... ব্রাউজারে খুলবে।
echo  সাইট বন্ধ করতে এই কালো উইন্ডোটি বন্ধ করুন।
echo.
start "" http://localhost:3000
node server.js
pause
