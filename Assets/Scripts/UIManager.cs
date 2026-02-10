using UnityEngine;
using UnityEngine.UI;

namespace ThermoDrift
{
    /// <summary>
    /// English HUD + flow panels: tap-to-start, score, target, revive/restart.
    /// </summary>
    public class UIManager : MonoBehaviour
    {
        [Header("Labels")]
        [SerializeField] private Text tapToStartLabel;
        [SerializeField] private Text targetLabel;
        [SerializeField] private Text multiplierLabel;
        [SerializeField] private Text scoreLabel;
        [SerializeField] private Text bestLabel;
        [SerializeField] private Text gateCueLabel;

        [Header("Panels")]
        [SerializeField] private GameObject revivePanel;
        [SerializeField] private Button reviveButton;
        [SerializeField] private Button restartButton;

        [Header("Cue")]
        [SerializeField, Min(0.1f)] private float cueDuration = 0.8f;
        private float cueTimer;

        private void OnEnable()
        {
            if (GameManager.Instance != null)
            {
                GameManager.Instance.OnTargetChanged += HandleTargetChanged;
                GameManager.Instance.OnGameStateChanged += HandleStateChanged;
                GameManager.Instance.OnSoftGateCue += HandleGateCue;
            }
        }

        private void Start()
        {
            if (reviveButton != null)
            {
                reviveButton.onClick.AddListener(RestartNow);
            }

            if (restartButton != null)
            {
                restartButton.onClick.AddListener(RestartNow);
            }

            RefreshStaticLabels();
            HandleStateChanged(GameManager.Instance != null ? GameManager.Instance.State : GameState.WaitingToStart);
        }

        private void Update()
        {
            GameManager gm = GameManager.Instance;
            if (gm == null)
            {
                return;
            }

            if (multiplierLabel != null)
            {
                multiplierLabel.text = $"Multiplier x{gm.Multiplier:0.0}";
            }

            if (scoreLabel != null)
            {
                scoreLabel.text = $"Score {Mathf.RoundToInt(gm.Score)}";
            }

            if (bestLabel != null)
            {
                bestLabel.text = $"Best {gm.BestScore}";
            }

            if (gateCueLabel != null && gateCueLabel.gameObject.activeSelf)
            {
                cueTimer -= Time.deltaTime;
                if (cueTimer <= 0f)
                {
                    gateCueLabel.gameObject.SetActive(false);
                }
            }
        }

        private void OnDisable()
        {
            if (GameManager.Instance != null)
            {
                GameManager.Instance.OnTargetChanged -= HandleTargetChanged;
                GameManager.Instance.OnGameStateChanged -= HandleStateChanged;
                GameManager.Instance.OnSoftGateCue -= HandleGateCue;
            }
        }

        private void HandleTargetChanged(float target)
        {
            if (targetLabel == null)
            {
                return;
            }

            string bucket = target < -0.33f ? "Cold" : (target > 0.33f ? "Hot" : "Neutral");
            targetLabel.text = $"Target {bucket} ({target:0.00})";
        }

        private void HandleStateChanged(GameState state)
        {
            if (tapToStartLabel != null)
            {
                tapToStartLabel.gameObject.SetActive(state == GameState.WaitingToStart);
                tapToStartLabel.text = "Tap to Start";
            }

            if (revivePanel != null)
            {
                revivePanel.SetActive(state == GameState.GameOver);
            }
        }

        private void HandleGateCue()
        {
            if (gateCueLabel == null)
            {
                return;
            }

            gateCueLabel.text = "Target Switched!";
            gateCueLabel.gameObject.SetActive(true);
            cueTimer = cueDuration;
        }

        private void RestartNow()
        {
            if (GameManager.Instance != null)
            {
                GameManager.Instance.RestartRun();
            }
        }

        private void RefreshStaticLabels()
        {
            if (tapToStartLabel != null)
            {
                tapToStartLabel.text = "Tap to Start";
            }

            if (targetLabel != null)
            {
                targetLabel.text = "Target Neutral (0.00)";
            }

            if (multiplierLabel != null)
            {
                multiplierLabel.text = "Multiplier x1.0";
            }

            if (scoreLabel != null)
            {
                scoreLabel.text = "Score 0";
            }

            if (bestLabel != null)
            {
                bestLabel.text = "Best 0";
            }

            if (gateCueLabel != null)
            {
                gateCueLabel.gameObject.SetActive(false);
            }
        }
    }
}
