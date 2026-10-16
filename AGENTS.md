<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Expose home stories through one pointer-draggable floating button; keep the position within viewport bounds and distinguish dragging from tapping.
- Keep sample content in an explicit local fixture module, visibly labeled Demo, and never write sample interactions to real accounts.
- Render the floating story control and viewer in body portals so surrounding page elements cannot clip them.
- Keep profile people lists in ConnectionsList and connection actions in ConnectButton; shared query invalidation keeps counts and lists consistent after actions.
- Open profile people lists in a dialog from header controls rather than a section below Highlights, keeping the profile content uninterrupted.
- Keep content creation options in the shared CreateMenu mounted on the signed-in user's profile, not in global navigation, to avoid duplicate entry controls.
