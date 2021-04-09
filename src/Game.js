import * as cards from './Cards';
import { Set } from 'immutable';
import axios from "axios";
import { useEffect, useState } from "react";
import {   useRouteMatch } from "react-router-dom";
import { useToasts } from 'react-toast-notifications';
import Hammer from 'react-hammerjs';

const symbols = {
    S: '♠',
    C: '♣',
    H: '♥',
    D: '♦',
};

let count = 0;

export const Game = () => {
    const { params } = useRouteMatch();
    const { addToast } = useToasts();
    const [socketCount, setSocketCount] = useState(0);
    const [positions, setPositions] = useState(0);

    const [game, setGame] = useState({
        room: {
            players: [],
            board: []
        },
        player: {
            hand: []
        }
    });

    useEffect(() => {
        axios.get(`/play/${params.id}`).then(({ data }) => {
            setGame(data);
            setPositions(data.player.hand.map((_, i) => i));
        });
    }, [socketCount]);

    const connect = () => {
        const socket = new WebSocket(
            `ws://localhost:8080/api/state/${params.id}`
        );
    
        socket.onmessage = async ev => {
            console.log(ev);
            setSocketCount(socket + 1);
        };
    
        socket.onerror = ev => {
            console.log(ev);
            setTimeout(connect, 1000);
        };
    };

    useEffect(() => {
        connect();
    }, []);
    
    const gap = window.innerWidth / game.player.hand.length - 20;

    let frame = 0;

    const onPan = ev => {
        if (frame < 20) {
            frame++;
            return;
        }
        
        frame = 0;

        const newPositions = [...positions];
        
        if (ev.direction == 4) {
            newPositions.push(newPositions.shift());
        } else if (ev.direction == 2) {
            newPositions.unshift(newPositions.pop());
        } else {
            return;
        }

        setPositions(newPositions);
    };

    const onSwipe = (ev) => {
        if (ev.direction == 8) {
            const length = game.player.hand.length;
            const half = length / 2;
            const current = game.player.hand[(length - positions[half]) % length];
            // console.log(positions);
            // console.log(current);
        }
    };

    return (
        <main>
            <div id="control">
                <div id="players">
                    <div className="player legend">
                        <br></br>
                        POINTS<br></br>
                        CARDS
                    </div>
                    {game.room.players.map(player =>
                        <div key={player.id} className={player.id == game.room.current_player.id ? 'current player' : 'player'}>
                            <div>{player.name}</div>
                            <div>
                                <div>
                                    {player.points}
                                </div>
                                <div>
                                    {player.card_points}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
                
                <button id="action">
                    
                </button>
            </div>
            <div className="form">
                <div id="board">
                    {game.room.board.map((card, i) =>
                    <img
                        key={toImage(card)}
                        src={cards[toImage(card)]} />)}
                </div>
                <Hammer onPan={onPan} onSwipe={onSwipe} direction="DIRECTION_ALL">                    
                    <div id="hand">
                        {game.player.hand.map((card, i) =>
                        <img
                            style={{ left: positions[i] * gap + 'px', ...topZ(positions[i], game.player.hand.length) }}
                            key={toImage(card)}
                            src={cards[toImage(card)]} />)}
                    </div>
                </Hammer>
            </div>
        </main>
    )
};

const topZ = (index, length) => {
    const half = length / 2;
    const style = { marginBottom: 0 };

    if (index < half) {
        style.zIndex = index;
    } else if (index == half) {
        style.zIndex = half;
        style.bottom = 10;
    } else {
        style.zIndex = length - index;
    }

    return style;
};

const toImage = cardTuple => {
    const [id, card] = cardTuple;

    if (card.Number) {
        const [number, color] = card.Number;
        return `${color.toLowerCase()[0]}${number}`;
    }

    if (typeof card == 'object') {
        const [[type, color]] = Object.entries(card);
        return `${color.toLowerCase()[0]}_${type.toLowerCase()}`;
    }

    if (card == 'ChangeColor') {
        return 'color';
    }

    return card.toLowerCase();
};

const toggle = (set, item) => set.has(item) ? set.delete(item) : set.add(item);

const action = (handSelection, boardSelection,
    roomId, addToast, setHandSelection, board, setBoardSelection) => async () => {

    let action;
    if (handSelection) {
        action = 'sum';
    } else if (boardSelection.size) {
        action = 'claim';
    } else {
        action = 'pass';
    }
    
    const request = {
        action,
        hand: handSelection,
        board: [...boardSelection].map(cardName =>
            board.find(card => card.name == cardName)
        )
    };

    try {
        await axios.post(`/turn/${roomId}`, request);
        
        if (action == 'pass') {
        }
    } catch (error) {
        addToast(error.response.data, {
            appearance: 'error',
            autoDismiss: true
        });
    }

    setBoardSelection(new Set());
    setHandSelection(null);
};

const actionText = (handSelection, boardSelection) => {
    if (handSelection) {
        if (!boardSelection.size) {
            return 'THROW ' + handSelection.name.replace(/[SCHD]/g, char => symbols[char]);
        }

        return 'SUM ' + [handSelection.name, ...boardSelection]
            .join(' + ')
            .replace(/[SCHD]/g, char => symbols[char]);
    }

    if (boardSelection.size) {
        return 'CLAIM ' + [...boardSelection]
            .join(', ')
            .replace(/[SCHD]/g, char => symbols[char]);
    }

    return 'PASS';
};

const actionClass = (handSelection, boardSelection) => {
    if (handSelection) {
        return '';
    }

    if (boardSelection.size) {
        return '';
    }

    return 'disabled';
};
