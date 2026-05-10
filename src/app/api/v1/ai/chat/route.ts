import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';
import { apiError, corsOptions } from '@/lib/api/api-helpers';
import { AgentExecutor, type AgentContext } from '@/lib/ai/agent';
import type { Message } from '@/lib/ai/provider';

export async function OPTIONS() {
  return corsOptions();
}

// ─── POST /api/v1/ai/chat ──────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    // Authenticate
    const session = await getServerSession(authOptions);
    let userId = 'system';
    let role = 'ADMIN';

    if (session?.user) {
      userId = session.user.id || 'system';
      role = session.user.role || 'ADMIN';
    } else {
      // Fallback: check header-based auth for API clients
      const headerRole = req.headers.get('x-user-role');
      const headerUserId = req.headers.get('x-user-id');
      if (headerRole) role = headerRole;
      if (headerUserId) userId = headerUserId;
    }

    // Parse request body
    const body = await req.json();
    const {
      message,
      conversationId,
      context: reqContext,
      conversationHistory,
      stream: shouldStream,
      confirm,
    } = body as {
      message: string;
      conversationId?: string;
      context?: { module?: string; entityId?: string; tenantId?: string };
      conversationHistory?: Message[];
      stream?: boolean;
      confirm?: string; // tool call ID to confirm
    };

    if (!message && !confirm) {
      return apiError('message is required', 400);
    }

    const agentContext: AgentContext = {
      userId,
      role,
      tenantId: reqContext?.tenantId || 'default',
      module: reqContext?.module,
      entityId: reqContext?.entityId,
    };

    const executor = new AgentExecutor();

    // Handle confirmation of a pending destructive action
    if (confirm) {
      const confirmResult = await executor.confirmAction(confirm);
      return Response.json({
        success: true,
        data: {
          type: 'confirmation_result',
          toolCallId: confirm,
          result: confirmResult,
        },
      });
    }

    const history: Message[] = conversationHistory || [];

    // Streaming response
    if (shouldStream) {
      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        async start(controller) {
          try {
            for await (const event of executor.executeStream(message, history, agentContext)) {
              const sseData = `data: ${JSON.stringify(event)}\n\n`;
              controller.enqueue(encoder.encode(sseData));
            }
            controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          } catch (err) {
            const errorMsg = err instanceof Error ? err.message : 'Stream error';
            const errorEvent = `data: ${JSON.stringify({ type: 'error', data: errorMsg })}\n\n`;
            controller.enqueue(encoder.encode(errorEvent));
          } finally {
            controller.close();
          }
        },
      });

      return new Response(stream, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
          'X-Conversation-Id': conversationId || `conv-${Date.now().toString(36)}`,
        },
      });
    }

    // Non-streaming response
    const result = await executor.execute(message, history, agentContext);

    return Response.json({
      success: true,
      data: {
        content: result.content,
        conversationId: conversationId || `conv-${Date.now().toString(36)}`,
        toolExecutions: result.toolExecutions.map(te => ({
          toolCallId: te.toolCallId,
          toolName: te.toolName,
          result: te.result,
          error: te.error,
          requiresConfirmation: te.requiresConfirmation,
          confirmationMessage: te.confirmationMessage,
        })),
        usage: result.usage,
        iterations: result.iterations,
      },
    });
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : 'Internal server error';
    console.error('AI Chat error:', errorMsg);
    return apiError(errorMsg, 500);
  }
}
