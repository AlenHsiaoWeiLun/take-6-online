import random
import time


def make_points(n: int) -> list[int]:
    points = [0] * (n + 1)
    for card in range(1, n + 1):
        if card % 55 == 0:
            points[card] = 7
        elif card % 11 == 0:
            points[card] = 5
        elif card % 10 == 0:
            points[card] = 3
        elif card % 5 == 0:
            points[card] = 2
        else:
            points[card] = 1
    return points


N = 104
P = 4
ROW_LEN = 5
ROWS = 4
TIME = 0.95
POINTS = make_points(N)


class BestPlayer1:
    """Random MCS; each sweep tests every card on the same sampled future."""

    def __init__(self, player_idx: int, seed: int | None = None):
        self.me = player_idx
        self.rng = random.Random(seed)

    def hidden(self, hand: list[int], hist: dict) -> list[int]:
        seen = [False] * (N + 1)

        for board in hist.get("board_history", []):
            for row in board:
                for card in row:
                    if 1 <= card <= N:
                        seen[card] = True

        for row in hist["board"]:
            for card in row:
                if 1 <= card <= N:
                    seen[card] = True

        for turn in hist.get("history_matrix", []):
            for card in turn:
                if 1 <= card <= N:
                    seen[card] = True

        for card in hand:
            if 1 <= card <= N:
                seen[card] = True

        return [card for card in range(1, N + 1) if not seen[card]]

    def board(self, hist: dict) -> tuple[list[int], list[int], list[int]]:
        tail: list[int] = []
        fill: list[int] = []
        pts: list[int] = []
        for row in hist["board"]:
            tail.append(row[-1])
            fill.append(len(row))
            pts.append(sum(POINTS[card] for card in row))
        return tail, fill, pts

    @staticmethod
    def put(
        card: int,
        pid: int,
        tail: list[int],
        fill: list[int],
        pts: list[int],
        score: list[int],
    ) -> None:
        row_id = -1
        best_tail = -1
        for i in range(ROWS):
            if tail[i] < card and tail[i] > best_tail:
                best_tail = tail[i]
                row_id = i

        if row_id >= 0:
            if fill[row_id] >= ROW_LEN:
                score[pid] += pts[row_id]
                tail[row_id] = card
                fill[row_id] = 1
                pts[row_id] = POINTS[card]
            else:
                tail[row_id] = card
                fill[row_id] += 1
                pts[row_id] += POINTS[card]
            return

        row_id = 0
        best = (pts[0], fill[0], 0)
        for i in range(1, ROWS):
            cur = (pts[i], fill[i], i)
            if cur < best:
                row_id = i
                best = cur

        score[pid] += pts[row_id]
        tail[row_id] = card
        fill[row_id] = 1
        pts[row_id] = POINTS[card]

    def deal(self, pool: list[int], size: int) -> list[list[int]]:
        deck = pool[:]
        self.rng.shuffle(deck)
        out: list[list[int]] = []
        for i in range(P - 1):
            start = i * size
            out.append(deck[start : start + size])
        return out

    def order(self, hand: list[int]) -> list[int]:
        cards = hand[:]
        self.rng.shuffle(cards)
        return cards

    def run(
        self,
        base_tail: list[int],
        base_fill: list[int],
        base_pts: list[int],
        base_score: list[int],
        my_order: list[int],
        opp_orders: list[list[int]],
        first: int,
    ) -> int:
        tail = base_tail[:]
        fill = base_fill[:]
        pts = base_pts[:]
        score = base_score[:]

        mine = [first] + [card for card in my_order if card != first]
        hands: list[list[int]] = []
        opp = 0
        for pid in range(P):
            if pid == self.me:
                hands.append(mine)
            else:
                hands.append(opp_orders[opp])
                opp += 1

        for turn in range(len(mine)):
            played = [(pid, hands[pid][turn]) for pid in range(P)]
            played.sort(key=lambda item: item[1])
            for pid, card in played:
                self.put(card, pid, tail, fill, pts, score)

        return score[self.me]

    def hint(self, card: int, tail: list[int], fill: list[int], pts: list[int]) -> tuple[float, int]:
        row_id = -1
        best_tail = -1
        for i, row_tail in enumerate(tail):
            if row_tail < card and row_tail > best_tail:
                best_tail = row_tail
                row_id = i

        if row_id < 0:
            return (float(min(pts)), card)

        if fill[row_id] >= ROW_LEN:
            return (float(pts[row_id] + 4), card)

        gap = card - tail[row_id]
        crowd = max(0, fill[row_id] - 3)
        return (0.02 * gap + 0.2 * crowd + 0.03 * pts[row_id], card)

    def pick(
        self,
        cards: list[int],
        total: dict[int, float],
        seen: dict[int, int],
        hint: dict[int, tuple[float, int]],
    ) -> int:
        tried = [card for card in cards if seen[card] > 0]
        if not tried:
            return min(cards, key=lambda card: (hint[card], card))

        return min(
            tried,
            key=lambda card: (
                total[card] / seen[card],
                -seen[card],
                0.001 * hint[card][0],
                card,
            ),
        )

    def action(self, hand: list[int], history: dict) -> int:
        if len(hand) == 1:
            return hand[0]

        stop = time.perf_counter() + TIME
        cards = hand[:]
        pool = self.hidden(hand, history)
        tail, fill, pts = self.board(history)
        score = history["scores"][:]
        hint = {card: self.hint(card, tail, fill, pts) for card in cards}

        total = {card: 0.0 for card in cards}
        seen = {card: 0 for card in cards}
        order = sorted(cards, key=lambda card: (hint[card], card))

        while time.perf_counter() < stop or all(count == 0 for count in seen.values()):
            opp_orders = self.deal(pool, len(hand))
            my_order = self.order(hand)
            for card in order:
                if time.perf_counter() >= stop and all(count > 0 for count in seen.values()):
                    break
                total[card] += self.run(tail, fill, pts, score, my_order, opp_orders, card)
                seen[card] += 1

        return self.pick(cards, total, seen, hint)
