import OpenAI from "openai";
import { NextResponse } from "next/server";
import { getPersona, isPersonaId } from "@/lib/personas";

type IncomingMessage = {
  role: "user" | "assistant";
  content: string;
};

type ChatRequest = {
  personaId?: string;
  messages?: IncomingMessage[];
};

const APIFY_LINKEDIN_ACTOR = "supreme_coder~linkedin-profile-scraper";
const APIFY_GOOGLE_SEARCH_ACTOR = "apify~google-search-scraper";

const LINKEDIN_PROFILE_URLS = {
  anshuman: "https://www.linkedin.com/in/anshumansingh26/",
  abhimanyu: "https://www.linkedin.com/in/abhimanyusaxena/",
  kshitij: "https://www.linkedin.com/in/kshitij-mishra-a5779334/"
} as const;

type PersonResearchTarget = {
  shouldResearch: boolean;
  personName: string;
};

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

function shouldResearchPerson(content: string) {
  const factualProfileQuestion =
    /\b(linkedin|profile|bio|biography|background|experience|work|worked|job|jobs|company|companies|career|timeline|education|college|degree|skill|skills|certification|certifications|project|projects|volunteer|role|designation|title|position|head\s+of|instructor|where\s+(did|has|does)|who\s+is|what\s+does|know|knows|codeforces|rating)\b/i.test(
      content
    );

  return factualProfileQuestion;
}

function clipText(value: string, maxLength = 7000) {
  return value.length > maxLength ? `${value.slice(0, maxLength)}... [truncated]` : value;
}

function getKnownLinkedInUrl(personName: string, fallbackPersonaId: keyof typeof LINKEDIN_PROFILE_URLS) {
  const normalizedName = personName.toLowerCase();

  if (normalizedName.includes("anshuman")) {
    return LINKEDIN_PROFILE_URLS.anshuman;
  }

  if (normalizedName.includes("abhimanyu")) {
    return LINKEDIN_PROFILE_URLS.abhimanyu;
  }

  if (normalizedName.includes("kshitij")) {
    return LINKEDIN_PROFILE_URLS.kshitij;
  }

  return personName ? "" : LINKEDIN_PROFILE_URLS[fallbackPersonaId];
}

function extractJsonObject(value: string) {
  const match = value.match(/\{[\s\S]*\}/);
  return match?.[0] ?? value;
}

async function inferPersonResearchTarget(
  content: string,
  activePersonaName: string
): Promise<PersonResearchTarget | null> {
  if (!shouldResearchPerson(content)) {
    return null;
  }

  try {
    const completion = await client.chat.completions.create({
      model: process.env.OPENAI_MODEL || "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            'Extract the person being asked about for profile/background research. Return only JSON like {"shouldResearch":true,"personName":"Full Name"}. If pronouns like he/him refer to the selected persona, use the selected persona name. If no person is being asked about, return {"shouldResearch":false,"personName":""}.'
        },
        {
          role: "user",
          content: `Selected persona: ${activePersonaName}\nUser question: ${content}`
        }
      ]
    });

    const rawContent = completion.choices[0]?.message.content ?? "";
    const parsed = JSON.parse(extractJsonObject(rawContent)) as Partial<PersonResearchTarget>;

    if (!parsed.shouldResearch || !parsed.personName) {
      return null;
    }

    return {
      shouldResearch: true,
      personName: parsed.personName
    };
  } catch (error) {
    console.error("Person research target inference failed", error);
    return null;
  }
}

function hasScalerContext(value: unknown) {
  return /\b(scaler|scaler school of technology|sst|interviewbit)\b/i.test(
    typeof value === "string" ? value : JSON.stringify(value)
  );
}

function findLinkedInProfileUrl(value: unknown, preferScalerContext = false): string {
  if (typeof value === "string") {
    const match = value.match(/https?:\/\/(?:[a-z]+\.)?linkedin\.com\/in\/[^\s"'<>),]+/i);
    return match?.[0] ?? "";
  }

  if (Array.isArray(value)) {
    if (preferScalerContext) {
      for (const item of value) {
        if (!hasScalerContext(item)) {
          continue;
        }

        const result = findLinkedInProfileUrl(item);

        if (result) {
          return result;
        }
      }
    }

    for (const item of value) {
      const result = findLinkedInProfileUrl(item);

      if (result) {
        return result;
      }
    }
  }

  if (value && typeof value === "object") {
    if (preferScalerContext && hasScalerContext(value)) {
      for (const item of Object.values(value)) {
        const result = findLinkedInProfileUrl(item);

        if (result) {
          return result;
        }
      }
    }

    for (const item of Object.values(value)) {
      const result = findLinkedInProfileUrl(item);

      if (result) {
        return result;
      }
    }
  }

  return "";
}

async function fetchGooglePersonContext(personName: string) {
  const apiKey = process.env.APIFY_API_KEY;

  if (!apiKey) {
    return {
      linkedInUrl: "",
      context: ""
    };
  }

  const endpoint = `https://api.apify.com/v2/acts/${APIFY_GOOGLE_SEARCH_ACTOR}/run-sync-get-dataset-items?token=${apiKey}`;

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        queries: `"${personName}" ("Scaler School of Technology" OR Scaler OR InterviewBit) LinkedIn profile work experience education`,
        maxPagesPerQuery: 1,
        resultsPerPage: 10
      })
    });

    if (!response.ok) {
      console.error("Apify Google search failed", response.status, await response.text());
      return {
        linkedInUrl: "",
        context: ""
      };
    }

    const items = (await response.json()) as unknown;
    const linkedInUrl = findLinkedInProfileUrl(items, true);
    const context = `## Fresh Google Search Context
The following search results were fetched server-side through Apify Google Search for "${personName}". The search intentionally prioritizes Scaler School of Technology, Scaler, and InterviewBit context first because the active personas are from that ecosystem. If multiple people have the same name, prefer results connected to Scaler/SST/InterviewBit. Use general same-name results only if no Scaler/SST result exists. Do not mention scraping/API details to the user.

${clipText(JSON.stringify(items, null, 2), 5000)}`;

    return {
      linkedInUrl,
      context
    };
  } catch (error) {
    console.error("Apify Google search error", error);
    return {
      linkedInUrl: "",
      context: ""
    };
  }
}

async function fetchLinkedInProfileContext(profileUrl: string, personName: string) {
  const apiKey = process.env.APIFY_API_KEY;

  if (!apiKey) {
    return "";
  }

  const endpoint = `https://api.apify.com/v2/acts/${APIFY_LINKEDIN_ACTOR}/run-sync-get-dataset-items?token=${apiKey}`;

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        urls: [{ url: profileUrl }],
        scrapeCompany: false,
        findContacts: false
      })
    });

    if (!response.ok) {
      console.error("Apify LinkedIn scraper failed", response.status, await response.text());
      return "";
    }

    const items = (await response.json()) as unknown;
    const serializedItems = clipText(JSON.stringify(items, null, 2));

    return `## Fresh LinkedIn Profile Context
The following data was fetched server-side from Apify's LinkedIn Profile Scraper for ${personName}: ${profileUrl}. Use it to answer questions about work experience, education, skills, certifications, projects, volunteering, and profile summary. Do not mention API keys or scraping internals to the user. If this data conflicts with older embedded profile notes, prefer this fresh data.

${serializedItems}`;
  } catch (error) {
    console.error("Apify LinkedIn scraper error", error);
    return "";
  }
}

async function fetchPersonResearchContext(
  content: string,
  personaId: keyof typeof LINKEDIN_PROFILE_URLS,
  activePersonaName: string
) {
  const target = await inferPersonResearchTarget(content, activePersonaName);

  if (!target) {
    return "";
  }

  const knownLinkedInUrl = getKnownLinkedInUrl(target.personName, personaId);
  const googleContext = knownLinkedInUrl
    ? { linkedInUrl: knownLinkedInUrl, context: "" }
    : await fetchGooglePersonContext(target.personName);
  const profileUrl = knownLinkedInUrl || googleContext.linkedInUrl;
  const linkedInContext = profileUrl
    ? await fetchLinkedInProfileContext(profileUrl, target.personName)
    : "";

  return `## Person Research Instructions
The user is asking about ${target.personName}. Use the fresh research context below if present. If no LinkedIn profile was found, use Google search context and say only what can be reasonably inferred.

Disambiguation rules:
- If any result or scraped profile connects the person to Scaler, Scaler School of Technology, SST, or InterviewBit, treat that as the intended person and do not mention unrelated same-name people.
- For Scaler/SST/InterviewBit-associated people, answer naturally. If the user asks "do you know him/her?", start with "Yes, I know him/her..." and then give role/context. Do not end with "I don't know him/her personally."
- For people outside the Scaler ecosystem, if the user asks "do you know him/her?", answer the factual part first and end briefly with "I don't know him/her personally."
- If no Scaler/SST/InterviewBit result exists and multiple same-name people remain, ask for one extra identifying detail casually. Do not say "There seem to be multiple people named..." or "the answer depends on which one you mean." Use wording like: "Which Shruti do you mean — the one from Scaler/SST?"

Human wording rules:
- Do not expose source mechanics in the answer. Avoid phrases like "public posts say", "LinkedIn posts connect", "search results show", "available public context", "scraped profile", or "from the data".
- If the result is clear enough, say it directly: "Yes, I know Shruti. She is associated with Scaler/SST..."
- If the exact title is not fully clear and the user did not ask for the exact title, do not mention that uncertainty; just answer with the known association/work area.
- If the user asks specifically for an exact current title and it is unclear, say it briefly without over-explaining.
- Only mention LinkedIn, public posts, sources, or verification if the user explicitly asks where the information came from.

${linkedInContext}

${googleContext.context}`;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as ChatRequest;

    if (!body.personaId || !isPersonaId(body.personaId)) {
      return NextResponse.json({ error: "Please choose a valid persona." }, { status: 400 });
    }

    const messages = body.messages ?? [];
    const latestUserMessage = messages.filter((message) => message.role === "user").at(-1);

    if (!latestUserMessage?.content.trim()) {
      return NextResponse.json({ error: "Please send a message first." }, { status: 400 });
    }

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: "The chatbot is not configured yet. Add OPENAI_API_KEY to your environment." },
        { status: 500 }
      );
    }

    const encoder = new TextEncoder();
    const persona = getPersona(body.personaId);
    const personResearchContext = await fetchPersonResearchContext(
      latestUserMessage.content,
      body.personaId,
      persona.name
    );
    const completionStream = await client.chat.completions.create({
      model: process.env.OPENAI_MODEL || "gpt-4o-mini",
      stream: true,
      messages: [
        { role: "system", content: persona.systemPrompt },
        ...(personResearchContext
          ? [{ role: "system" as const, content: personResearchContext }]
          : []),
        ...messages.map((message) => ({
          role: message.role,
          content: message.content
        }))
      ]
    });

    const stream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of completionStream) {
            const content = chunk.choices[0]?.delta?.content;

            if (content) {
              controller.enqueue(encoder.encode(content));
            }
          }
        } catch (streamError) {
          console.error("Chat stream error", streamError);
          controller.error(streamError);
          return;
        }

        controller.close();
      }
    });

    return new Response(stream, {
      headers: {
        "Cache-Control": "no-cache, no-transform",
        "Content-Type": "text/plain; charset=utf-8",
        "X-Accel-Buffering": "no"
      }
    });
  } catch (error) {
    console.error("Chat API error", error);
    return NextResponse.json(
      { error: "Something went wrong while contacting the AI. Please try again." },
      { status: 500 }
    );
  }
}
