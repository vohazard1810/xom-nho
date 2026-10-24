# Agent acknowledgements

Mỗi sự kiện là một dòng JSON, được agent commit trên nhánh riêng.
Không viết trạng thái queue trực tiếp. `attempt` bắt đầu từ 1, tăng sau mỗi lần Codex yêu cầu sửa.
`base_commit` lấy từ outbox. Sự kiện `completed` trỏ tới commit triển khai trước commit ACK.

Ví dụ (chỉ minh họa, không phải bằng chứng):

```text
{"task_id":"EXAMPLE","attempt":1,"actor":"Antigravity","event":"received","base_commit":"BASE_SHA"}
{"task_id":"EXAMPLE","attempt":1,"actor":"Antigravity","event":"started","base_commit":"BASE_SHA"}
{"task_id":"EXAMPLE","attempt":1,"actor":"Antigravity","event":"completed","base_commit":"BASE_SHA","result_commit":"IMPLEMENTATION_SHA"}
```

Agent phải commit received trước khi làm, commit started trước khi chỉnh sửa, commit code,
sau đó append completed và commit ACK. Không dùng ví dụ trên như ACK thật.
