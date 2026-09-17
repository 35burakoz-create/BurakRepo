using System;
using UnityEngine;

namespace ThermoDrift
{
    public enum GameState
    {
        WaitingToStart,
        Running,
        GameOver
    }

    /// <summary>
    /// Central state machine, score system, target-temperature cycle, and restart flow.
    /// </summary>
    public class GameManager : MonoBehaviour
    {
        public static GameManager Instance { get; private set; }

        [Header("Temperature Target")]
        [SerializeField] private float targetTemp = 0f;
        [SerializeField, Min(0.05f)] private float targetTolerance = 0.2f;
        [SerializeField, Min(1f)] private float randomRetargetInterval = 12f;

        [Header("Speed / Score")]
        [SerializeField, Min(1f)] private float baseScrollSpeed = 7f;
        [SerializeField, Min(0f)] private float speedBoostAtPerfect = 3f;
        [SerializeField, Min(1f)] private float minMultiplier = 1f;
        [SerializeField, Min(1f)] private float maxMultiplier = 4f;

        [Header("Best Score")]
        [SerializeField] private string bestScoreKey = "BestScore";

        private float score;
        private float multiplier = 1f;
        private float currentSpeed;
        private float alignment01 = 1f;
        private float retargetTimer;
        private int bestScore;

        public GameState State { get; private set; } = GameState.WaitingToStart;
        public float TargetTemp => targetTemp;
        public float TargetTolerance => targetTolerance;
        public float Score => score;
        public float Multiplier => multiplier;
        public float CurrentSpeed => currentSpeed;
        public float Alignment01 => alignment01;
        public int BestScore => bestScore;

        public event Action<float> OnTargetChanged;
        public event Action<GameState> OnGameStateChanged;
        public event Action OnSoftGateCue;

        private void Awake()
        {
            if (Instance != null && Instance != this)
            {
                Destroy(gameObject);
                return;
            }

            Instance = this;
            bestScore = PlayerPrefs.GetInt(bestScoreKey, 0);
            currentSpeed = baseScrollSpeed;
        }

        private void Update()
        {
            if (State == GameState.WaitingToStart && IsPointerDown())
            {
                StartRun();
            }

            if (State != GameState.Running)
            {
                return;
            }

            retargetTimer += Time.deltaTime;
            if (retargetTimer >= randomRetargetInterval)
            {
                retargetTimer = 0f;
                SetTargetTemp(UnityEngine.Random.Range(-1f, 1f), true);
            }

            multiplier = Mathf.Lerp(minMultiplier, maxMultiplier, alignment01);
            currentSpeed = baseScrollSpeed + speedBoostAtPerfect * alignment01;
            score += currentSpeed * multiplier * Time.deltaTime;
        }

        public void SetAlignment(float distanceToTarget)
        {
            if (targetTolerance <= 0.0001f)
            {
                alignment01 = 0f;
                return;
            }

            alignment01 = Mathf.Clamp01(1f - (distanceToTarget / targetTolerance));
        }

        public void SetTargetTemp(float newTarget, bool showCue)
        {
            targetTemp = Mathf.Clamp(newTarget, -1f, 1f);
            retargetTimer = 0f;
            OnTargetChanged?.Invoke(targetTemp);

            if (showCue)
            {
                OnSoftGateCue?.Invoke();
            }
        }

        public void AddScore(float amount)
        {
            if (State != GameState.Running || amount <= 0f)
            {
                return;
            }

            score += amount;
        }

        public void GameOver()
        {
            if (State != GameState.Running)
            {
                return;
            }

            State = GameState.GameOver;
            int roundedScore = Mathf.RoundToInt(score);
            if (roundedScore > bestScore)
            {
                bestScore = roundedScore;
                PlayerPrefs.SetInt(bestScoreKey, bestScore);
                PlayerPrefs.Save();
            }

            OnGameStateChanged?.Invoke(State);
        }

        public void RestartRun()
        {
            UnityEngine.SceneManagement.SceneManager.LoadScene(UnityEngine.SceneManagement.SceneManager.GetActiveScene().buildIndex);
        }

        private void StartRun()
        {
            score = 0f;
            multiplier = minMultiplier;
            currentSpeed = baseScrollSpeed;
            alignment01 = 1f;
            retargetTimer = 0f;
            State = GameState.Running;
            OnGameStateChanged?.Invoke(State);
            OnTargetChanged?.Invoke(targetTemp);
        }

        private static bool IsPointerDown()
        {
            if (Input.touchCount > 0)
            {
                return Input.GetTouch(0).phase == TouchPhase.Began;
            }

            return Input.GetMouseButtonDown(0);
        }
    }
}
