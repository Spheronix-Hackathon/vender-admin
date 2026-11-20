import { io, Socket } from 'socket.io-client';

const getSocketUrl = () => {
    if (typeof window !== 'undefined') {
        const { hostname, protocol, origin } = window.location;
        if (protocol === 'https:' || hostname.includes('trycloudflare.com') || hostname.includes('cloudflare')) {
            return origin;
        }
        return `http://${hostname}:5050`;
    }
    return process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:5050';
};

let realSocket: Socket | null = null;

function getClientSocket(): Socket {
    if (typeof window === 'undefined') {
        return {
            on: () => {},
            off: () => {},
            emit: () => {},
            disconnect: () => {},
            connect: () => {},
        } as unknown as Socket;
    }
    if (!realSocket) {
        realSocket = io(getSocketUrl(), {
            autoConnect: true,
        });
    }
    return realSocket;
}

export const socket = new Proxy({} as Socket, {
    get(_target, prop) {
        const instance = getClientSocket();
        const value = Reflect.get(instance, prop);
        if (typeof value === 'function') {
            return value.bind(instance);
        }
        return value;
    }
});
