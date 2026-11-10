const net = require('net');
const pty = require('node-pty'); // 依然需要 npm install node-pty

const PORT = 14484;
const PASSWORD = 'mysecret.#';

const server = net.createServer((socket) => {
    let passBuffer = '';
    
    // 建立连接后，提示输入密码
    socket.write("Password: ");

    // 独立的认证监听器
    const authHandler = (data) => {
        const input = data.toString();

        // 处理退格键 (Backspace)
        if (input === '\b' || input === '\x7f') {
            if (passBuffer.length > 0) {
                passBuffer = passBuffer.slice(0, -1);
                socket.write('\b \b'); // 在屏幕上擦除星号
            }
            return;
        }

        // 检测到回车键 (Enter)
        if (input.includes('\r') || input.includes('\n')) {
            if (passBuffer === PASSWORD) {
                socket.write("\r\n\x1b[32mAccess Granted. Welcome to the PTY shell!\x1b[0m\r\n");
                
                // 认证成功，移除密码监听器，启动 Shell
                socket.removeListener('data', authHandler);
                startShell(socket);
            } else {
                socket.write("\r\n\x1b[31mAccess denied.\x1b[0m\r\nPassword: ");
                passBuffer = '';
            }
        } else {
            // 记录密码并回显星号
            passBuffer += input;
            socket.write('*'); 
        }
    };

    socket.on('data', authHandler);

    socket.on('error', (err) => {
        console.error('Socket error:', err.message);
    });
});

function startShell(socket) {
    // 启动伪终端
    const ptyProcess = pty.spawn('/bin/sh', [], {
        name: 'xterm-color',
        cols: 80,
        rows: 24,
        cwd: __dirname,
        env: process.env
    });

    // 将 PTY 的输出直接写入 TCP Socket
    ptyProcess.onData((data) => {
        socket.write(data);
    });

    // 将 TCP Socket 接收到的指令直接写入 PTY
    socket.on('data', (data) => {
        ptyProcess.write(data);
    });

    // 处理断开连接的情况
    ptyProcess.onExit(() => socket.destroy());
    socket.on('close', () => ptyProcess.kill());
}

server.listen(PORT, () => {
    console.log(`TCP Terminal server listening on port ${PORT}`);
    console.log(`Use Putty to connect -> IP: your_ip, Port: ${PORT}, Connection type: Raw`);
});
