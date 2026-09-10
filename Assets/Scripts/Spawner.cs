using System.Collections.Generic;
using UnityEngine;

namespace ThermoDrift
{
    public enum SpawnKind
    {
        Obstacle,
        Bonus,
        Gate
    }

    [System.Serializable]
    public class SpawnPrefab
    {
        public SpawnKind kind;
        public GameObject prefab;
        [Range(1, 40)] public int preloadCount = 8;
    }

    /// <summary>
    /// Spawns obstacle/bonus/gate content ahead of the player and recycles with a small pool.
    /// </summary>
    public class Spawner : MonoBehaviour
    {
        [Header("References")]
        [SerializeField] private TemperatureField temperatureField;

        [Header("Pool")]
        [SerializeField] private SpawnPrefab[] prefabs;

        [Header("Spawn Space")]
        [SerializeField] private float minX = -2.4f;
        [SerializeField] private float maxX = 2.4f;
        [SerializeField] private float spawnY = 9f;
        [SerializeField] private float despawnY = -7f;
        [SerializeField] private float laneStep = 0.6f;

        [Header("Rates")]
        [SerializeField, Min(0.1f)] private float spawnEverySeconds = 0.45f;
        [SerializeField, Min(1f)] private float gateEverySeconds = 8f;
        [SerializeField, Range(0f, 1f)] private float obstacleChanceIdealZone = 0.15f;
        [SerializeField, Range(0f, 1f)] private float obstacleChanceNonIdealZone = 0.65f;
        [SerializeField, Range(0f, 1f)] private float bonusChanceIdealZone = 0.5f;

        private readonly Dictionary<SpawnKind, Queue<GameObject>> pool = new();
        private readonly List<SpawnedItem> active = new();

        private float spawnTimer;
        private float gateTimer;
        private float idealAnchorX;

        private struct SpawnedItem
        {
            public GameObject gameObject;
            public SpawnKind kind;
        }

        private void Start()
        {
            if (temperatureField == null)
            {
                temperatureField = FindObjectOfType<TemperatureField>();
            }

            BuildPools();
        }

        private void Update()
        {
            GameManager gm = GameManager.Instance;
            if (gm == null || gm.State != GameState.Running)
            {
                return;
            }

            MoveAndRecycleActive(gm.CurrentSpeed);

            spawnTimer += Time.deltaTime;
            gateTimer += Time.deltaTime;

            if (gateTimer >= gateEverySeconds)
            {
                gateTimer = 0f;
                SpawnGate(gm);
            }

            if (spawnTimer >= spawnEverySeconds)
            {
                spawnTimer = 0f;
                SpawnWave(gm);
            }
        }

        private void BuildPools()
        {
            foreach (SpawnPrefab entry in prefabs)
            {
                if (entry.prefab == null)
                {
                    continue;
                }

                if (!pool.ContainsKey(entry.kind))
                {
                    pool[entry.kind] = new Queue<GameObject>();
                }

                for (int i = 0; i < entry.preloadCount; i++)
                {
                    GameObject item = Instantiate(entry.prefab, transform);
                    item.SetActive(false);
                    pool[entry.kind].Enqueue(item);
                }
            }
        }

        private void SpawnWave(GameManager gm)
        {
            float now = Time.time;
            idealAnchorX = temperatureField != null
                ? temperatureField.FindNearestIdealX(idealAnchorX, minX, maxX, now, gm.TargetTemp, gm.TargetTolerance)
                : 0f;

            for (float x = minX; x <= maxX + 0.001f; x += laneStep)
            {
                bool ideal = temperatureField != null && temperatureField.IdealMask(x, now, gm.TargetTemp, gm.TargetTolerance);

                if (ideal)
                {
                    if (Random.value < bonusChanceIdealZone)
                    {
                        Spawn(SpawnKind.Bonus, new Vector3(x, spawnY, 0f));
                    }
                    else if (Random.value < obstacleChanceIdealZone)
                    {
                        Spawn(SpawnKind.Obstacle, new Vector3(x, spawnY, 0f));
                    }
                }
                else if (Random.value < obstacleChanceNonIdealZone)
                {
                    Spawn(SpawnKind.Obstacle, new Vector3(x, spawnY, 0f));
                }
            }

            // Guarantee a reachable ideal lane by keeping anchor area clear.
            DespawnAround(idealAnchorX, 0.35f);
        }

        private void SpawnGate(GameManager gm)
        {
            GameObject gateObj = Spawn(SpawnKind.Gate, new Vector3(idealAnchorX, spawnY + 1f, 0f));
            if (gateObj == null)
            {
                return;
            }

            TempGate gate = gateObj.GetComponent<TempGate>();
            if (gate != null)
            {
                gate.Configure(GetDramaticTarget(gm.TargetTemp));
            }
        }

        private float GetDramaticTarget(float current)
        {
            if (current < -0.33f)
            {
                return Random.value > 0.5f ? 0f : 1f;
            }

            if (current > 0.33f)
            {
                return Random.value > 0.5f ? 0f : -1f;
            }

            return Random.value > 0.5f ? -1f : 1f;
        }

        private void MoveAndRecycleActive(float speed)
        {
            for (int i = active.Count - 1; i >= 0; i--)
            {
                SpawnedItem item = active[i];
                if (item.gameObject == null || !item.gameObject.activeSelf)
                {
                    active.RemoveAt(i);
                    continue;
                }

                item.gameObject.transform.position += Vector3.down * (speed * Time.deltaTime);
                if (item.gameObject.transform.position.y <= despawnY)
                {
                    Recycle(item.gameObject, item.kind);
                    active.RemoveAt(i);
                }
            }
        }

        private void DespawnAround(float xCenter, float radius)
        {
            for (int i = active.Count - 1; i >= 0; i--)
            {
                SpawnedItem item = active[i];
                if (item.kind != SpawnKind.Obstacle || item.gameObject == null)
                {
                    continue;
                }

                if (Mathf.Abs(item.gameObject.transform.position.x - xCenter) <= radius)
                {
                    Recycle(item.gameObject, item.kind);
                    active.RemoveAt(i);
                }
            }
        }

        private GameObject Spawn(SpawnKind kind, Vector3 position)
        {
            if (!pool.TryGetValue(kind, out Queue<GameObject> bucket))
            {
                return null;
            }

            GameObject item = bucket.Count > 0 ? bucket.Dequeue() : Expand(kind);
            if (item == null)
            {
                return null;
            }

            item.transform.position = position;
            item.SetActive(true);
            active.Add(new SpawnedItem { gameObject = item, kind = kind });
            return item;
        }

        private GameObject Expand(SpawnKind kind)
        {
            foreach (SpawnPrefab entry in prefabs)
            {
                if (entry.kind == kind && entry.prefab != null)
                {
                    GameObject item = Instantiate(entry.prefab, transform);
                    item.SetActive(false);
                    return item;
                }
            }

            return null;
        }

        private void Recycle(GameObject item, SpawnKind kind)
        {
            item.SetActive(false);
            if (!pool.ContainsKey(kind))
            {
                pool[kind] = new Queue<GameObject>();
            }

            pool[kind].Enqueue(item);
        }
    }
}
