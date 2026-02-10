using UnityEngine;

namespace ThermoDrift
{
    /// <summary>
    /// Scrolls visual background using material UV offset.
    /// </summary>
    public class TrackScroller : MonoBehaviour
    {
        [SerializeField] private Renderer trackRenderer;
        [SerializeField] private string textureProperty = "_MainTex";
        [SerializeField] private float uvScrollFactor = 0.07f;

        private Material runtimeMaterial;
        private Vector2 currentOffset;

        private void Awake()
        {
            if (trackRenderer != null)
            {
                runtimeMaterial = trackRenderer.material;
            }
        }

        private void Update()
        {
            GameManager gm = GameManager.Instance;
            if (gm == null || gm.State != GameState.Running || runtimeMaterial == null)
            {
                return;
            }

            currentOffset.y += gm.CurrentSpeed * uvScrollFactor * Time.deltaTime;
            runtimeMaterial.SetTextureOffset(textureProperty, currentOffset);
        }
    }
}
