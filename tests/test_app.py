import unittest

from app import StockItem, build_whatsapp_message, rank_stock_items


class AppTests(unittest.TestCase):
    def test_whatsapp_format(self):
        item = StockItem(name="Silver Travertine CC", specification="French Pattern 1.2 cm, tumbled")
        msg = build_whatsapp_message("Tile AU", item)
        self.assertEqual(
            msg,
            "\n".join(
                [
                    "Hi Tile AU,",
                    "Burak from NELAMAR (Turkey).",
                    "Silver Travertine CC,",
                    "French Pattern 1.2 cm, tumbled",
                    "Are you interested in this stone or others?",
                    "Reply STOP to unsubscribe.",
                ]
            ),
        )

    def test_rank_stock_items(self):
        website_text = """
        Premium silver travertine tiles collection.
        Available in french pattern and tumbled surface.
        """
        items = [
            StockItem(name="Silver Travertine CC", specification="French Pattern 1.2 cm, tumbled"),
            StockItem(name="Noce Travertine", specification="French Pattern 3 cm, unfilled"),
        ]

        ranked = rank_stock_items(website_text, items, top_n=1)
        self.assertEqual(ranked[0].item.name, "Silver Travertine CC")


if __name__ == "__main__":
    unittest.main()
