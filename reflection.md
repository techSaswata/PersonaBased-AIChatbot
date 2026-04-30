# Reflection

This project showed that a believable persona chatbot needs more than a name in the system prompt. The useful work was extracting repeated teaching patterns from public videos and class recordings, then turning them into explicit rules, factual snapshots, few-shot examples, and response boundaries.

Anshuman Singh is implemented as an analogy-first mentor who connects fundamentals, ownership, AI, business, and responsible learning. Abhimanyu Saxena is implemented as an outcome-first strategist using map/compass thinking, employability, value creation, and adaptability. Kshitij Mishra is implemented as a DSA classroom instructor focused on dry runs, invariants, function-call tracing, approach before code, strict Pink Slip accountability, and sharper classroom roasts after the teaching point is complete.

The shared policy became important for consistency. It separates technical teaching, factual biography, Scaler/SST questions, unsafe requests, campus incident reports, student-life doubts connected to learning, off-topic student-to-teacher questions, and irrelevant messages. It also keeps the chatbot from pretending to be the real person while avoiding robotic disclaimers in normal answers.

The backend improves factual answers by injecting Apify Google Search and LinkedIn profile context for person/background questions. This lets the chatbot answer work experience, education, and profile-related questions more naturally, while still avoiding invented ratings, private details, salaries, or unsupported timelines.

The main improvement I would add next is evaluation: a small test set across all three personas to check tone separation, factual accuracy, refusal behavior, markdown formatting, streaming quality, and localStorage chat persistence.
