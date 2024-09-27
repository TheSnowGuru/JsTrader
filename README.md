### 🚀 JsTraderApi

The **JsTraderApi** is a powerful connection/interface that bridges your JavaScript strategies with MT4/5 terminals. This functionality is analogous to our well-known **Pytrader_API**, which is widely used by many strategies coded in Python. 

In addition to the JsTraderApi, an **Expert Advisor (EA)** is required for both MT4 and MT5 terminals, and these are included as part of the system. The demo version offers full functionality for the following instruments: 

- **EURUSD**
- **AUDCHF**
- **NZDCHF**
- **GBPNZD**
- **USDCAD**
- **DAX** (added as an index instrument in the demo)

📄 **Documentation**  
The functionality is thoroughly documented in a PDF file.

---

### 🔧 Requirements

- A running **MT4 or MT5 terminal**.
- The appropriate EA must be active on at least one chart.
- Fill in the socket server port and, for the licensed version, the folder with the authentication indicator.
- The demo version is fully functional for the mentioned instruments, and the authentication indicator can be acquired via [MQL5 Markets](https://www.mql5.com).

### ⚡ Performance

The socket communication is **very fast** (interrupt-based), ensuring efficient execution. The execution time of functions depends on the specific function and the selected broker. The MT terminal acts as a server while the JsTraderApi acts as a client, facilitating a question-and-answer interaction.

---

### 💻 Coding Examples Available

For any questions, feel free to join our **Discord Server**:  
👉 [Join Discord Community](https://discord.gg/DUCV9jxKF6)

### ✅ Implemented Functions

1. Instantiation
2. Connect to server
3. Check connection
4. Disconnect from MT terminal
5. Change timeout value
6. Get broker server time
7. Get static account information
8. Get dynamic account information
9. Get instrument information
10. Get broker instrument names
11. Check instrument in market watch
12. Check license type
13. Check if trading is allowed
14. Check terminal type
15. Check terminal server connection
16. Get last tick information
17. Get actual bar information
18. Get specific bars
19. Get last X ticks from now
20. Get last X bars from now
21. Open order
22. Set stop loss and take profit for position
23. Set stop loss and take profit for order (pending)
24. Reset stop loss and take profit for position
25. Reset stop loss and take profit for pending order
26. Change settings for pending order
27. Delete pending order
28. Close position
29. Close position partially
30. Close position by opposite position (CloseBy)
31. Close positions asynchronously
32. Get all pending orders
33. Get all deleted pending orders within window
34. Get all deleted pending orders

---

### 📈 Join Our Best Trading Broker

👉 [Join Our Best Supported Broker](https://track.deriv.be/_ftmJINnYNJE5TVC3w-F7AGNd7ZgqdRLk/4/)

🔗 **Get the Full Unlimited Version Here:**  
👉 [JsTrader Full Version](https://www.mql5.com/en/market/product/123435)

Thank you for your support, and happy trading! 💰✨
