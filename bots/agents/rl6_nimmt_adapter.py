import importlib
import json
import os
import sys
from typing import Any, Dict, List, Optional


def _ensure_numpy_compat() -> None:
    import numpy as np

    if not hasattr(np, "int"):
        np.int = int  # type: ignore[attr-defined]
    if not hasattr(np, "float"):
        np.float = float  # type: ignore[attr-defined]
    if not hasattr(np, "bool"):
        np.bool = bool  # type: ignore[attr-defined]


class RL6NimmtAgentAdapter:
    def __init__(
        self,
        player_idx: int = 0,
        repo_root: str = "./vendor/rl-6-nimmt",
        agent_name: str = "mcts",
        agent_module: Optional[str] = None,
        agent_class: Optional[str] = None,
        model_path: Optional[str] = None,
        agent_kwargs: Optional[Dict[str, Any]] = None,
        device: str = "cpu",
    ) -> None:
        self.player_idx = player_idx
        self.repo_root = os.path.abspath(repo_root)
        self.agent_name = agent_name
        self.agent_module = agent_module
        self.agent_class = agent_class
        self.model_path = self._resolve_optional_path(model_path)
        self.agent_kwargs = agent_kwargs or {}
        self.device_name = device

        if not os.path.isdir(self.repo_root):
            raise FileNotFoundError(
                f"rl-6-nimmt repo not found at {self.repo_root}. "
                "Set repo_root in FAI_AGENT_ARGS to the cloned repo path."
            )

        if self.repo_root not in sys.path:
            sys.path.insert(0, self.repo_root)

        try:
            _ensure_numpy_compat()
            import torch
        except ModuleNotFoundError as exc:
            raise ModuleNotFoundError(
                "rl-6-nimmt adapter requires numpy, torch, and gym. "
                "Install the RL dependencies before selecting this agent."
            ) from exc

        self.torch = torch
        self.dtype = torch.float
        self.device = torch.device(self.device_name)
        self.agent = self._load_agent()

        if hasattr(self.agent, "to"):
            self.agent = self.agent.to(self.device, self.dtype)
        if hasattr(self.agent, "eval"):
            self.agent.eval()

    def action(self, hand: List[int], history: Dict[str, Any]) -> int:
        legal_actions = sorted(self._to_zero_based(card) for card in hand)
        state = self._build_state(hand, history)
        action, _ = self.agent(state, legal_actions=legal_actions)
        return self._to_one_based(int(action))

    def _load_agent(self) -> Any:
        if self.model_path:
            return self.torch.load(self.model_path, map_location=self.device)

        if self.agent_module and self.agent_class:
            module = importlib.import_module(self.agent_module)
            cls = getattr(module, self.agent_class)
            return cls(**self.agent_kwargs)

        agents_module = importlib.import_module("rl_6_nimmt.agents")
        registry = getattr(agents_module, "AGENTS")
        cls = registry.get(self.agent_name)
        if cls is None:
            available = ", ".join(sorted(registry.keys()))
            raise ValueError(
                f"Unknown rl-6-nimmt agent_name '{self.agent_name}'. "
                f"Available values: {available}"
            )
        return cls(**self.agent_kwargs)

    def _build_state(self, hand: List[int], history: Dict[str, Any]):
        board = history.get("board", [])
        num_players = len(history.get("scores", []))
        if not num_players:
            raise ValueError("history.scores is required to infer player count")

        hand_zero = [self._to_zero_based(card) for card in sorted(hand)]
        board_zero = [[self._to_zero_based(card) for card in row] for row in board]

        padded_hand = hand_zero + [-1 for _ in range(10 - len(hand_zero))]
        cards_per_row = [len(row) for row in board_zero]
        highest_per_row = [row[-1] if row else -1 for row in board_zero]
        score_per_row = [self._row_value(row) for row in board_zero]

        board_flat: List[int] = []
        for row in board_zero:
            padded_row = row + [-1 for _ in range(6 - len(row))]
            board_flat.extend(padded_row[:6])

        state_values = (
            padded_hand
            + [num_players]
            + cards_per_row
            + highest_per_row
            + score_per_row
            + board_flat
        )

        return self.torch.tensor(state_values).to(self.device, self.dtype)

    def _resolve_optional_path(self, path: Optional[str]) -> Optional[str]:
        if not path:
            return None
        if os.path.isabs(path):
            return path
        return os.path.abspath(path)

    @staticmethod
    def _to_zero_based(card: int) -> int:
        if not 1 <= int(card) <= 104:
            raise ValueError(f"Expected 1-based card in [1, 104], got {card}")
        return int(card) - 1

    @staticmethod
    def _to_one_based(card: int) -> int:
        return int(card) + 1

    @staticmethod
    def _row_value(cards: List[int]) -> int:
        return sum(RL6NimmtAgentAdapter._card_value(card) for card in cards)

    @staticmethod
    def _card_value(card: int) -> int:
        value = card + 1
        if value == 55:
            return 7
        if value % 11 == 0:
            return 5
        if value % 10 == 0:
            return 3
        if value % 5 == 0:
            return 2
        return 1
