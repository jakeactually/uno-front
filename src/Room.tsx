import axios, { AxiosError } from "axios";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { NavigateFunction, useNavigate, useParams } from "react-router-dom";

export type Game = {
    room: Room,
    player: Player,
};

export type Room = {
    state: string,
    chain_count: number,
    current_player: Player,
    players: Player[],
    board: DeckCard[],
    color: string,
};

export type Player = {
    id: number,
    name: string,
    hand: DeckCard[],
    drawed: boolean,
};

export type CardColor = "Red" | "Blue" | "Green" | "Yellow";
export type CardAction = "Stop" | "Reverse" | "Plus2" | "Plus4" | "ChangeColor";
export type NumberCard = { Number: [number, CardColor] };
export type ActionCard = { [K in CardAction]?: CardColor } | CardAction;
export type DeckCard = [number, NumberCard | ActionCard];

export const Room = () => {
    const params = useParams();
    const navigate = useNavigate();
    const [room, setRoom] = useState<Room>({ players: [] } as unknown as Room);
    const [update, setUpdate] = useState(0);

    useEffect(() => {
        (async () => {
            try {
                const { data } = await axios.get(`/room/${params.id}`);
                setRoom(data);
            } catch (error) {
                if ((error as AxiosError).response?.status === 401) {
                    navigate(`/join-room/${params.id}`);
                }
            }
        })();
    }, [update]);

    const connect = () => {
        const socket = new WebSocket(
            `ws://localhost:8080/api/state/${params.id}`
        );
    
        socket.onmessage = async ev => {
            console.log(ev);
            setUpdate(update + 1);
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
                onClick={play(navigate, params.id || '', room, toast)}>
                Play
            </button>
            <button type="button" className="blue-button">
                Leave
            </button>
        </form>
    </main>;
};

export const play = (navigate: NavigateFunction, roomId: string, room: Room, toast: { error: Function }) => () => {
    if (room.players.length === 2 || room.players.length === 4) {
        navigate(`/play/${roomId}`);
    } else {
        toast.error('There must be 2 or 4 players');
    }
};
