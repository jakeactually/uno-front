import axios from "axios";
import { useEffect, useState } from "react";
import { useHistory, useRouteMatch } from "react-router-dom";
import { useToasts } from 'react-toast-notifications';

export const Room = () => {
    const { params } = useRouteMatch();
    const history = useHistory();
    const [room, setRoom] = useState({ players: [] });
    const [socket, setSocket] = useState(0);
    const { addToast } = useToasts();

    useEffect(() => {
        (async () => {
            try {
                const { data } = await axios.get(`/room/${params.id}`);
                setRoom(data);
            } catch (error) {
                if (error.response.status === 401) {
                    history.push(`/join-room/${params.id}`);
                }
            }
        })();
    }, [socket]);

    const connect = () => {
        const socket = new WebSocket(
            `ws://localhost:8080/api/state/${params.id}`
        );
    
        socket.onmessage = async ev => {
            console.log(ev);
            setSocket(socket + 1);
        };
    
        socket.onerror = ev => {
            console.log(ev);
            setTimeout(connect, 1000);
        };
    };

    useEffect(() => {
        connect();
    }, []);

    return <main>
        <form>
            <div id="room-id">Room #{params.id}</div>

            <p id="invite-text">
                You can invite others by sharing the link of this page
            </p>

            <div id="player-names">
                { room.players.map((player, i) =>
                <div key={i} className="player-name">
                    {player.name}
                </div>)
                }
            </div>

            <button
                type="button"
                className="blue-button down"
                onClick={play(history, params.id, room, addToast)}>
                Play
            </button>
            <button type="button" className="blue-button">
                Leave
            </button>
        </form>
    </main>;
};

export const play = (history, roomId, room, addToast) => () => {
    if (room.players.length === 2 || room.players.length === 4) {
        history.push(`/play/${roomId}`);
    } else {
        addToast('There must be 2 or 4 players', {
            appearance: 'error',
            autoDismiss: true
        });
    }
};
