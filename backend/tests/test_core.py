import unittest
from app.matching import normalize_title, similarity, match
from app.pipeline import run_pipeline, calculate_metrics

class MatchingTests(unittest.TestCase):
    def test_normalize_edition_and_platform(self):
        self.assertEqual(normalize_title("The Witcher 3: Wild Hunt - GOTY Edition (PC)"),"the witcher 3 wild hunt")
    def test_exact_match(self): self.assertEqual(similarity("Hades","Hades"),1.0)
    def test_uncertain_match_is_not_auto_accepted(self):
        result=match("Hades",["Hades"],1.0)
        self.assertTrue(result["uncertain"])

class PipelineTests(unittest.TestCase):
    def test_modes_equivalent_scores(self):
        records=[{"canonical_title":"Hades","candidate_title":"Hades"},{"canonical_title":"Portal 2","candidate_title":"Portal II"}]
        a=run_pipeline(records,"sequential"); b=run_pipeline(records,"concurrent"); c=run_pipeline(records,"parallel",cpu_workers=2)
        self.assertEqual(a["scores"],b["scores"]); self.assertEqual(a["scores"],c["scores"])
    def test_fetch_failures_are_counted(self):
        def bad(): raise ValueError("fixture")
        r=run_pipeline([{"fetcher":bad}],"sequential")
        self.assertEqual(r["fetch_failed"],1)
    def test_bounded_queue_with_more_items_than_capacity(self):
        records=[{"fetcher":(lambda n=i:n),"canonical_title":"Game","candidate_title":"Game"} for i in range(20)]
        r=run_pipeline(records,"concurrent",io_workers=4,queue_size=1)
        self.assertEqual(r["fetch_success"],20)
    def test_benchmark_metrics(self):
        rows=calculate_metrics(10,{1:[10,10],2:[6,6]})
        self.assertAlmostEqual(rows[1]["speedup_absolute"],10/6)

if __name__=="__main__": unittest.main()
