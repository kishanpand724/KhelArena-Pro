PORT=3001 npx tsx server.ts > server-debug.log 2>&1 &
SERVER_PID=$!
sleep 5
curl -X POST -H "Content-Type: application/json" -d '{"amount": 100, "userId": "test_user_123"}' http://localhost:3001/api/payment/create-order
kill $SERVER_PID
