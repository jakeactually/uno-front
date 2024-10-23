import * as cards from './Cards.tsx';
import axios, { AxiosError } from "axios";
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { useDrag } from '@use-gesture/react';
import { ActionCard, DeckCard, Game, NumberCard, Player, Room } from './Room.tsx';
import toast from 'react-hot-toast';

type Turn = { color?: string; card_id?: number; };

let count = 0;

export const GameComponent = () => {
    const params = useParams();
    const [, setSocketCount] = useState(0);
    const [positions, setPositions] = useState<number[]>([]);
    const [showColorModal, setShowColorModal] = useState(false);
    const [turn, setTurn] = useState<Turn | null>(null);

    const [game, setGame] = useState<Game>({
        room: {
            current_player: {
                id: 0,
                name: '',
                hand: [],
                drawed: false,
            },
            players: [],
            board: [],
            chain_count: 0,
            color: 'Red',
            state: '',
        },
        player: {
            id: 0,
            name: '',
            hand: [],
            drawed: false,
        }
    });

    useEffect(() => {
        axios.get<Game>(`/play/${params.id}`).then(({ data }) => {
            setGame(data);
            setPositions(data.player.hand.map((_, i) => i));
        });
    }, [count]);

    const connect = () => {
        const socket = new WebSocket(
            `ws://localhost:8080/api/state/${params.id}`
        );

        socket.onmessage = ev => {
            count = count + 1;
            setSocketCount(count);
            console.log(ev);
        };

        socket.onerror = ev => {
            console.log(ev);
            setTimeout(connect, 1000);
        };
    };

    useEffect(() => {
        connect();
    }, []);

    const cell = window.innerWidth / (game.player.hand.length + 1);
    let frame = 0;

    const bind = useDrag(
        ({ last, movement: [mx], direction: [dx], memo = positions }) => {
            // Deep copy of current positions
            let newPositions = [...memo];

            if (mx % 20 != 0) return;

            if (dx > 0) {
                // Pan right
                newPositions.push(newPositions.shift() || 0);
            } else if (dx < 0) {
                // Pan left
                newPositions.unshift(newPositions.pop() || 0);
            } else {
                return memo; // No change in direction
            }

            // Update positions state
            setPositions(newPositions);

            return newPositions; // Store positions for memoization
        },
        { axis: 'x' } // Only care about horizontal movement
    );

    const handleSwipe = useDrag(
        ({ direction: [dx, dy], last, memo = game.player.hand }) => {
            if (last && dy < 0) {
                // Swipe up logic (dy < 0 means swipe up)
                const length = game.player.hand.length;
                const half = Math.floor(length / 2 + (length % 2)) % length;
                const [card_id, card] = game.player.hand[(length - positions[half]) % length];

                console.log(card);
                const turn = { card_id };
                setTurn(turn);

                if (isColorCard((card as ActionCard))) {
                    setShowColorModal(true);
                } else {
                    doTurn(turn);
                }
            }
        },
        { axis: 'y', filterTaps: true } // Only detect vertical swipes
    );

    const onError = (error: AxiosError) => {
        toast(error.response?.data?.toString() || '', {});
    };

    const doTurn = (turn: Turn) => {
        axios.post(`/turn/${params.id}`, turn).catch(onError);
    };

    const top = game.room.board[game.room.board.length - 1];
    const { text, onclick, className } = action(onError, params.id || '', game.room, game.player);

    return (
        <main>
            <div id="control">
                <div id="players">
                    {game.room.players.map(player =>
                        <div key={player.name} className={player.id === game.room.current_player.id ? 'current player' : 'player'}>
                            <div>{player.name}</div>
                            <div>
                                <div>
                                    {player.hand.length}
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                <button id="action" onClick={onclick} className={className}>
                    {text}
                </button>
                {isColorCard(top as ActionCard) && <div style={{ color: 'white' }}>
                    Current color is {game.room.color}
                </div>}
            </div>
            <div className="form">
                <div id="board">
                    {game.room.board.map((card, i) =>
                        <img
                            style={{ top: -i }}
                            key={card[0]}
                            alt={toImage(card)}
                            src={cards[toImage(card) as keyof typeof cards]} />)}
                </div>
                <div {...bind()}>
                    <div id="hand"  {...handleSwipe()}>
                        {game.player.hand.map((card, i) =>
                            <img
                                alt={toImage(card)}
                                style={{
                                    left: (positions[i] + 1) * cell + 'px',
                                    ...topZ(positions[i], game.player.hand.length)
                                }}
                                draggable={false}
                                key={card[0]}
                                src={cards[toImage(card) as keyof typeof cards]} />)}
                    </div>
                </div>
            </div>

            {showColorModal && <div id="choose-color">
                {['Red', 'Green', 'Blue', 'Yellow'].map(color => <>
                    <div
                        key={color}
                        id={color.toLowerCase()}
                        onClick={() => {
                            const newTurn = { ...turn, color };
                            setTurn(newTurn);
                            doTurn(newTurn);
                            setShowColorModal(false);
                        }}>
                    </div>
                </>)}
            </div>}
        </main>
    )
};

const isColorCard = (card: ActionCard) => card === 'Plus4' || card === 'ChangeColor';

const topZ = (index = 0, length = 0) => {
    const half = Math.floor(length / 2);
    const style = { marginBottom: 0, zIndex: 0, bottom: 0 };

    if (index < half) {
        style.zIndex = index + 1;
    } else if (index === half) {
        style.zIndex = half + 1;
        style.bottom = 10;
    } else {
        style.zIndex = length - index;
    }

    return style;
};

const toImage = (cardTuple: DeckCard): string => {
    const [, card] = cardTuple;

    if ((card as NumberCard).Number) {
        const [number, color] = (card as NumberCard).Number;
        return `${color.toLowerCase()[0]}${number}`;
    }

    if (typeof card === 'object') {
        const [[type, color]] = Object.entries(card);
        return `${color.toLowerCase()[0]}_${type.toLowerCase()}`;
    }

    if (card === 'ChangeColor') {
        return 'color';
    }

    return card.toLowerCase();
};

const action = (onError: (_: AxiosError) => void, roomId: string, { state, chain_count: count, current_player }: Room, { id, drawed }: Player) => {
    let action = { text: '', className: '', onclick: () => { } };

    if (current_player.id != id) {
        action.text = 'Stand by';
        action.className = 'disabled';
        action.onclick = () => {

        };
    } else if (state === "Plus2") {
        action.text = 'Draw ' + count * 2;
        action.onclick = () => {
            axios.post('/penalty/' + roomId).catch(onError);
        };
    } else if (state === "Plus4") {
        action.text = 'Draw ' + count * 4;
        action.onclick = () => {
            axios.post('/penalty/' + roomId).catch(onError);
        };
    } else if (state === "Stop") {
        action.text = 'Pass';
        action.onclick = () => {
            axios.post('/penalty/' + roomId).catch(onError);
        };
    } else if (drawed) {
        action.text = 'Pass';
        action.onclick = () => {
            axios.post('/pass/' + roomId).catch(onError);
        };
    } else {
        action.text = 'Draw';
        action.onclick = () => {
            axios.post('/draw/' + roomId).catch(onError);
        };
    }

    return action;
};
