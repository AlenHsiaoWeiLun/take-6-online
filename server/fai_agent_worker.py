#!/usr/bin/env python3
import importlib
import json
import os
import sys
import traceback


def emit(payload):
    sys.stdout.write(json.dumps(payload) + "\n")
    sys.stdout.flush()


def load_agent():
    agent_root = os.getcwd()
    if agent_root not in sys.path:
        sys.path.insert(0, agent_root)

    module_name = os.environ.get("FAI_AGENT_MODULE", "src.players.TA.random_player")
    class_name = os.environ.get("FAI_AGENT_CLASS", "RandomPlayer")
    args_json = os.environ.get("FAI_AGENT_ARGS", "{}")
    player_idx = int(os.environ.get("FAI_AGENT_PLAYER_IDX", "0"))

    args = json.loads(args_json) if args_json else {}

    module = importlib.import_module(module_name)
    cls = getattr(module, class_name)
    if args:
        return cls(player_idx=player_idx, **args)
    return cls(player_idx=player_idx)


def main():
    agent = load_agent()

    for raw_line in sys.stdin:
        line = raw_line.strip()
        if not line:
            continue

        request = json.loads(line)

        if request.get("type") == "shutdown":
            break

        if request.get("type") != "action":
            emit({"requestId": request.get("requestId"), "error": f"Unsupported request type: {request.get('type')}"})
            continue

        try:
            card = agent.action(request["hand"], request["history"])
            emit({"requestId": request["requestId"], "card": int(card)})
        except Exception as exc:
            emit({
                "requestId": request.get("requestId"),
                "error": str(exc),
                "traceback": traceback.format_exc()
            })


if __name__ == "__main__":
    try:
        main()
    except Exception as exc:
        emit({"error": str(exc), "traceback": traceback.format_exc()})
        raise
