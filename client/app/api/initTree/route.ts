import { NextRequest, NextResponse } from "next/server";
import { getNodeWithChildren } from "@/functions/getNode";

export async function POST(request: NextRequest) {
    const { topic } = await request.json();
    const node = await getNodeWithChildren(topic);
    // const node = {
    //     "title": "Large language model",
    //     "summary": "Large Language Models (LLMs) are machine learning models designed for natural language processing, particularly language generation. They have many parameters and are trained on vast amounts of text using self-supervised learning. Generative Pretrained Transformers (GPTs) are among the most capable LLMs, often fine-tuned for specific tasks using prompt engineering. While powerful, LLMs can inherit inaccuracies and biases from their training data.\n\nBefore Transformers, statistical language models dominated due to their ability to process large datasets. Google's 2016 Neural Machine Translation used seq2seq LSTM networks. The Transformer architecture, introduced in 2017, improved upon seq2seq with the attention mechanism. BERT (encoder-only) and GPT (decoder-only) models followed, with GPT models gaining prominence for solving tasks via prompting. Later models like ChatGPT and GPT-4 captured public attention due to their consumer applications and increased accuracy, respectively. More recently, source-available models like BLOOM and LLaMA have become popular, alongside models with permissive licenses like Mistral AI's offerings. Multimodal LLMs (LMMs) can process different data types, such as images and audio.\n\nDataset preprocessing includes tokenization, which converts text to numerical tokens using methods like byte-pair encoding (BPE). Datasets are cleaned to remove low-quality, duplicated, or toxic data, and synthetic data may be used to supplement natural data. Training involves techniques like reinforcement learning from human feedback (RLHF) and instruction tuning. Mixture of Experts (MoE) can be used for extremely large models. Prompt engineering leverages the attention mechanism and context windows to achieve results, often replacing costly fine-tuning.\n\nTraining LLMs requires significant infrastructure and is expensive. Scaling laws dictate that performance depends on training cost, network size, and dataset size. LLMs exhibit emergent abilities, such as in-context learning. They can be used with external tools via fine-tuning or retrieval-augmented generation (RAG) to enhance their capabilities. Although not autonomous agents by themselves, LLMs can be integrated with modules to act as agents, employing patterns like ReAct and methods like DEPS and Reflexion.\n\nCompression techniques like post-training quantization reduce the space requirements of large models. Multimodality is achieved by \"tokenizing\" different data types, such as images, and interleaving them with text tokens. Reasoning models, a newer development, spend more time generating step-by-step solutions.\n\nLLMs are evaluated using metrics like perplexity and task-specific datasets. Adversarially constructed evaluations address limitations of standard benchmarks. Concerns exist around memorization, security, algorithmic bias, and energy demands.\n\nELI5: Imagine teaching a computer to talk by showing it tons of books and articles. These books are turned into puzzle pieces called tokens. The computer learns to predict the next token. Bigger brains (more parameters) and more books (larger datasets) make it better. Sometimes, the computer also gets feedback from people to improve. It's like teaching a parrot, but this parrot can write stories and answer questions!",
    //     "keywords": [
    //       "Transfer learning",
    //       "Knowledge representation",
    //       "Overfitting",
    //       "Regularization",
    //       "Backpropagation",
    //       "Neural scaling laws",
    //       "Vector database",
    //       "Gradient Descent",
    //       "Artificial General Intelligence (AGI)",
    //       "Few-shot learning",
    //       "Zero-shot learning",
    //       "Parameter efficiency",
    //       "Edge computing",
    //       "Federated learning",
    //       "Explainable AI (XAI)"
    //     ]
    //   }
    return NextResponse.json(node);
}