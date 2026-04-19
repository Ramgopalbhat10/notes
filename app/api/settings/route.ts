import { NextRequest, NextResponse } from "next/server";
import { getRedisClient } from "@/lib/cache/redis-client";
import { requireApiUser } from "@/lib/auth";
import { DEFAULT_CHAT_MODEL, parseModelId } from "@/lib/ai/models";

const SETTINGS_KEY_PREFIX = "user:settings:";

export type UserSettings = {
  editor: {
    defaultMode: "preview" | "edit";
  };
  appearance: {
    centeredLayout: boolean;
  };
  privacy: {
    rememberLastOpenedFile: boolean;
  };
  ai: {
    defaultModel: string;
  };
};

export const defaultUserSettings: UserSettings = {
  editor: {
    defaultMode: "preview",
  },
  appearance: {
    centeredLayout: false,
  },
  privacy: {
    rememberLastOpenedFile: true,
  },
  ai: {
    defaultModel: DEFAULT_CHAT_MODEL,
  },
};

function sanitizeAiSettings(
  incoming: unknown,
  fallback: UserSettings["ai"],
): UserSettings["ai"] {
  const raw = (incoming ?? {}) as Partial<UserSettings["ai"]>;
  const validated = parseModelId(raw.defaultModel);
  return {
    defaultModel: validated ?? fallback.defaultModel,
  };
}

function getSettingsKey(userId: string): string {
  return `${SETTINGS_KEY_PREFIX}${userId}`;
}

export async function GET(request: NextRequest) {
  const authRes = await requireApiUser(request);
  if (!authRes.ok) {
    return NextResponse.json({ error: authRes.error }, { status: authRes.status });
  }

  const userId = authRes.session.user.id;

  try {
    const redis = getRedisClient();
    const key = getSettingsKey(userId);
    const data = await redis.get<UserSettings>(key);
    
    // Merge with defaults to ensure all fields exist
    const settings: UserSettings = {
      ...defaultUserSettings,
      ...data,
      editor: { ...defaultUserSettings.editor, ...data?.editor },
      appearance: { ...defaultUserSettings.appearance, ...data?.appearance },
      privacy: { ...defaultUserSettings.privacy, ...data?.privacy },
      ai: sanitizeAiSettings(data?.ai, defaultUserSettings.ai),
    };

    return NextResponse.json(settings);
  } catch (error) {
    console.error("Failed to fetch settings:", error);
    return NextResponse.json({ error: "Failed to fetch settings" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  const authRes = await requireApiUser(request);
  if (!authRes.ok) {
    return NextResponse.json({ error: authRes.error }, { status: authRes.status });
  }

  const userId = authRes.session.user.id;

  try {
    const body = await request.json();
    const redis = getRedisClient();
    const key = getSettingsKey(userId);
    
    // Get current settings
    const current = await redis.get<UserSettings>(key);
    
    // Deep merge with current settings
    const updated: UserSettings = {
      editor: { ...(current?.editor ?? defaultUserSettings.editor), ...body.editor },
      appearance: { ...(current?.appearance ?? defaultUserSettings.appearance), ...body.appearance },
      privacy: { ...(current?.privacy ?? defaultUserSettings.privacy), ...body.privacy },
      ai: sanitizeAiSettings(
        { ...(current?.ai ?? defaultUserSettings.ai), ...body.ai },
        current?.ai ?? defaultUserSettings.ai,
      ),
    };

    // Store in Redis (no expiration - persistent)
    await redis.set(key, updated);

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Failed to save settings:", error);
    return NextResponse.json({ error: "Failed to save settings" }, { status: 500 });
  }
}
