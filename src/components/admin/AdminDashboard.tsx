"use client";

import { type ReactNode, useState } from "react";
import AdminActivityCharts from "@/components/admin/AdminActivityCharts";
import AdminContentManager from "@/components/admin/AdminContentManager";
import AdminThemePanel from "@/components/admin/AdminThemePanel";
import AdminUsersPanel from "@/components/admin/AdminUsersPanel";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type {
  ForumCommentRecord as AdminForumComment,
  ForumPostRecord as AdminPost,
  ForumTopicRecord as AdminTopic,
  NewsCommentRecord as AdminNewsComment,
  NewsRecord as AdminArticle,
  StoryRecord as AdminStory,
} from "@/server/directus/types";

type ServerActionFn = (formData: FormData) => Promise<void>;

interface SummaryStat {
  label: string;
  value: number;
  icon?: ReactNode;
  trend?: string;
}

interface AdminStatus {
  rolesVirtual: boolean;
  usersFallback: boolean;
  usersSource: "legacy" | "directus" | "unknown";
}

interface AdminDashboardProps {
  stats: SummaryStat[];
  topics: AdminTopic[];
  posts: AdminPost[];
  news: AdminArticle[];
  forumComments: AdminForumComment[];
  newsComments: AdminNewsComment[];
  stories: AdminStory[];
  topicTitleById: Record<number, string>;
  updateTopic: ServerActionFn;
  deleteTopic: ServerActionFn;
  updatePost: ServerActionFn;
  deletePost: ServerActionFn;
  updateArticle: ServerActionFn;
  deleteArticle: ServerActionFn;
  updateForumComment: ServerActionFn;
  deleteForumComment: ServerActionFn;
  updateNewsComment: ServerActionFn;
  deleteNewsComment: ServerActionFn;
  updateStory: ServerActionFn;
  deleteStory: ServerActionFn;
}

export default function AdminDashboard(props: AdminDashboardProps) {
  const [adminStatus, setAdminStatus] = useState<AdminStatus>({
    rolesVirtual: false,
    usersFallback: false,
    usersSource: "unknown",
  });

  const statusItems: string[] = [];
  if (adminStatus.usersFallback && adminStatus.usersSource === "legacy") {
    statusItems.push("Recherche utilisateurs en mode legacy.");
  }

  return (
    <div className="space-y-6">
      {statusItems.length > 0 && (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3">
          <div className="mb-1 text-xs font-semibold uppercase tracking-wider text-amber-300">
            Mode degrade
          </div>
          <ul className="space-y-0.5 text-sm text-amber-200/80">
            {statusItems.map((item, index) => (
              <li key={index}>{item}</li>
            ))}
          </ul>
        </div>
      )}

      <Tabs defaultValue="activity" className="space-y-4">
        <TabsList className="h-auto gap-1 bg-[color:var(--bg-800)]/60 p-1.5">
          <TabsTrigger
            value="activity"
            className="rounded-md px-6 py-3 text-sm font-medium transition-all data-[state=active]:bg-purple-600 data-[state=active]:text-white"
          >
            Activite
          </TabsTrigger>
          <TabsTrigger
            value="content"
            className="rounded-md px-6 py-3 text-sm font-medium transition-all data-[state=active]:bg-purple-600 data-[state=active]:text-white"
          >
            Contenus
          </TabsTrigger>
          <TabsTrigger
            value="users"
            className="rounded-md px-6 py-3 text-sm font-medium transition-all data-[state=active]:bg-purple-600 data-[state=active]:text-white"
          >
            Utilisateurs
          </TabsTrigger>
          <TabsTrigger
            value="theme"
            className="rounded-md px-6 py-3 text-sm font-medium transition-all data-[state=active]:bg-purple-600 data-[state=active]:text-white"
          >
            Theme
          </TabsTrigger>
        </TabsList>

        <TabsContent value="activity">
          <Card className="border-[color:var(--bg-700)]/50 bg-[color:var(--bg-800)]/30">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Tableau de bord</CardTitle>
              <p className="text-sm text-muted-foreground">
                Vue d&apos;ensemble de l&apos;activite du site sur les derniers jours.
              </p>
            </CardHeader>
            <CardContent>
              <AdminActivityCharts />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="content">
          <Card className="border-[color:var(--bg-700)]/50 bg-[color:var(--bg-800)]/30">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Gestion des contenus</CardTitle>
              <p className="text-sm text-muted-foreground">
                Recherchez, modifiez et moderez les sujets, articles et commentaires.
              </p>
            </CardHeader>
            <CardContent>
              <AdminContentManager
                topics={props.topics}
                posts={props.posts}
                news={props.news}
                forumComments={props.forumComments}
                newsComments={props.newsComments}
                topicTitleById={props.topicTitleById}
                updateTopic={props.updateTopic}
                deleteTopic={props.deleteTopic}
                updatePost={props.updatePost}
                deletePost={props.deletePost}
                updateArticle={props.updateArticle}
                deleteArticle={props.deleteArticle}
                updateForumComment={props.updateForumComment}
                deleteForumComment={props.deleteForumComment}
                updateNewsComment={props.updateNewsComment}
                deleteNewsComment={props.deleteNewsComment}
                stories={props.stories}
                updateStory={props.updateStory}
                deleteStory={props.deleteStory}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="users">
          <Card className="border-[color:var(--bg-700)]/50 bg-[color:var(--bg-800)]/30">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Utilisateurs et roles</CardTitle>
              <p className="text-sm text-muted-foreground">
                Gerez les utilisateurs et leurs permissions.
              </p>
            </CardHeader>
            <CardContent>
              <AdminUsersPanel onStatusChange={setAdminStatus} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="theme">
          <Card className="border-[color:var(--bg-700)]/50 bg-[color:var(--bg-800)]/30">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Theme du header</CardTitle>
              <p className="text-sm text-muted-foreground">
                Modifiez le logo et le fond affiches derriere le logo dans le header.
              </p>
            </CardHeader>
            <CardContent>
              <AdminThemePanel />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
